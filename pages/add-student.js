import React, { useState } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout"; // Use the new layout with Navbar
import withRole from "../utils/withRole"; // Adjust the path if needed

const AddStudent = () => {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("id", id); // Student ID will be sent here
    formData.append("image", image);

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_PI_URL}/upload-student`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Show success or error message
      setMessage(`Success: ${response.data.message}`);
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="add-student-container">
        <h1 className="title">Add Student Information</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="form-group">
            <label htmlFor="name">Student Name:</label>
            <input
              className="input-field"
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="id">Student ID:</label>
            <input
              className="input-field"
              type="text"
              id="id"
              name="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="image">Upload Image:</label>
            <input
              className="file-input"
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              required
            />
          </div>
          <button className="submit-button" type="submit">
            Submit
          </button>
        </form>

        {message && <p className="status-message">{message}</p>}
      </div>
    </DashboardLayout>
  );
};

export default withRole(AddStudent, ["teacher", "admin"]);