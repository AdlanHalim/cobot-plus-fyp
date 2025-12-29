/**
 * @file health.js
 * @location cobot-plus-fyp/pages/api/health.js
 * 
 * @description
 * Health check endpoint for Render deployment.
 * Returns a simple 200 OK response to indicate the service is running.
 */

export default function handler(req, res) {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'cobot-plus'
    });
}
