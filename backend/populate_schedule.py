# backend/populate_schedule.py

import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv
import urllib3
from urllib.parse import urljoin

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Configuration ---
load_dotenv()
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use service_role key
SCHEDULE_URL = "https://myapps.iium.edu.my/StudentOnline/schedule1.php"

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the .env.local file.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def scrape_schedule_data():
    """Submits the form and follows pagination links to scrape all results."""
    print("Starting to scrape all schedule pages...")
    
    KULLIYYAH = 'KICT'
    SEMESTER = '2'
    COURSE_TYPE = '<'
    
    form_payload = {
        'kuly': KULLIYYAH, 'sem': SEMESTER, 'ctype': COURSE_TYPE, 'course': '',
        'action': 'view', 'ses': '2024/2025', 'search': 'Submit'
    }
    
    all_scraped_data = []
    pages_to_scrape = set()
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        print("--- Submitting initial form to get first page ---")
        response = requests.post(SCHEDULE_URL, data=form_payload, headers=headers, timeout=10, verify=False)
        response.raise_for_status()
        
        pages_to_scrape.add(response.url)
        soup = BeautifulSoup(response.text, 'html.parser')
        pagination_links = soup.find_all('a', href=True)
        
        for link in pagination_links:
            if 'view=' in link['href'] and 'kuly=KICT' in link['href']:
                full_url = urljoin(SCHEDULE_URL, link['href'])
                pages_to_scrape.add(full_url)
        
        print(f"Found {len(pages_to_scrape)} pages to scrape.")

    except requests.exceptions.RequestException as e:
        print(f"Error submitting the initial form: {e}")
        return []

    for i, page_url in enumerate(pages_to_scrape):
        print(f"--- Scraping page {i+1}/{len(pages_to_scrape)}: {page_url} ---")
        try:
            response = requests.get(page_url, headers=headers, timeout=10, verify=False)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching page {page_url}: {e}")
            continue

        soup = BeautifulSoup(response.text, 'html.parser')
        schedule_table = soup.find('table', {'bgcolor': '#cccccc'})
        if not schedule_table:
            print(f"Could not find the schedule table on page. Skipping.")
            continue

        # More robust way to find course rows: get all rows and skip the header
        all_rows_in_table = schedule_table.find_all('tr')
        course_rows = all_rows_in_table[1:] # Skip the first header row

        for row in course_rows:
            cells = row.find_all('td')
            if len(cells) >= 5:
                course_code = cells[0].get_text(strip=True)
                section_code = cells[1].get_text(strip=True)
                course_name = cells[2].get_text(strip=True)
                
                schedule_nested_table = cells[4].find('table')
                if not schedule_nested_table:
                    continue

                schedule_rows = schedule_nested_table.find_all('tr')
                for sched_row in schedule_rows:
                    sched_cells = sched_row.find_all('td')
                    if len(sched_cells) >= 4:
                        day = sched_cells[0].get_text(strip=True)
                        time = sched_cells[1].get_text(strip=True)
                        venue = sched_cells[2].get_text(strip=True)
                        lecturer_name = sched_cells[3].get_text(strip=True)

                        if day and time and venue:
                            all_scraped_data.append({
                                "course_code": course_code, "course_name": course_name,
                                "section_code": section_code, "lecturer_name": lecturer_name,
                                "day": day, "time": time, "venue": venue
                            })

    print(f"--- Scraping complete. Found a total of {len(all_scraped_data)} class entries. ---")
    return all_scraped_data

def load_data_into_db(supabase: Client, data):
    """Loads the transformed data into the Supabase database."""
    print("Loading data into the database...")
    day_map = {"MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6, "SUN": 7, 
                "M-W": 1, "T-TH": 2}
    
    def parse_time(time_str, period):
        """Converts a time string like '10' or '11.20' to HH:MM format."""
        if '.' in time_str:
            hour, minute = time_str.split('.')
        else:
            hour, minute = time_str, '00'
        
        hour = int(hour)
        minute = int(minute)

        if period == 'PM' and hour != 12:
            hour += 12
        if period == 'AM' and hour == 12:
            hour = 0
            
        return f"{hour:02d}:{minute:02d}"

    for i, entry in enumerate(data):
        try:
            # Skip table headers
            if entry['course_code'] == 'Code':
                continue

            # 1. Upsert the Course
            supabase.table("courses").upsert({
                "course_code": entry['course_code'], "course_name": entry['course_name']
            }).execute()

            # 2. Parse and Upsert the Location
            # Handle venues like '-' or single words
            if entry['venue'] == '-':
                building_name = 'TBA'
                room_number = None
            else:
                venue_parts = entry['venue'].split(' ', 1)
                building_name = venue_parts[0]
                room_number = venue_parts[1] if len(venue_parts) > 1 else None
            
            location_res = supabase.table("locations").select("id").eq("building_name", building_name).eq("room_number", room_number).execute()
            if not location_res.data:
                supabase.table("locations").insert({"building_name": building_name, "room_number": room_number}).execute()
                location_res = supabase.table("locations").select("id").eq("building_name", building_name).eq("room_number", room_number).execute()
            location_id = location_res.data[0]['id']

            # 3. Parse and Upsert the Timetable Slot with robust time parsing
            time_parts = entry['time'].split()
            if len(time_parts) < 4:
                # Not a valid time format like "start - end period"
                print(f"Skipping entry due to invalid time format: {entry}")
                continue

            period = time_parts[-1] # AM or PM
            start_time_str = time_parts[0]
            end_time_str = time_parts[2]
            
            start_time = parse_time(start_time_str, period)
            end_time = parse_time(end_time_str, period)

            day_str = entry['day'].split('-')[0]
            day_of_week = day_map.get(day_str.upper())
            if day_of_week:
                slot_res = supabase.table("timetable_slots").select("id").eq("day_of_week", day_of_week).eq("start_time", start_time).eq("end_time", end_time).execute()
                if not slot_res.data:
                    supabase.table("timetable_slots").insert({"day_of_week": day_of_week, "start_time": start_time, "end_time": end_time}).execute()
                    slot_res = supabase.table("timetable_slots").select("id").eq("day_of_week", day_of_week).eq("start_time", start_time).eq("end_time", end_time).execute()
                timetable_slot_id = slot_res.data[0]['id']
            else:
                timetable_slot_id = None

            # 4. INSERT the Section
            supabase.table("sections").insert({
                "course_id": entry['course_code'], "section_code": entry['section_code'],
                "lecturer_name": entry['lecturer_name'], "location_id": location_id,
                "timetable_slot_id": timetable_slot_id
            }).execute()

        except Exception as e:
            print(f"!!! ERROR processing entry #{i}: {entry}")
            print(f"!!! Error details: {e}")
            continue

    print("Data successfully loaded into the database.")


if __name__ == "__main__":
    # --- DEBUGGING LINE ---
    print(f"Attempting to connect with URL: {os.getenv('SUPABASE_URL')}")
    print(f"Attempting to connect with KEY: {os.getenv('SUPABASE_SERVICE_ROLE_KEY')[:20]}...") # Prints first 20 chars of the key
    # --- END DEBUGGING ---

    try:
        supabase = get_supabase_client()
        schedule_data = scrape_schedule_data()
        if schedule_data:
            load_data_into_db(supabase, schedule_data)
    except Exception as e:
        print(f"An error occurred: {e}")