import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail', // You can use other services like SendGrid, Mailgun, etc.
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
        }
    });
};

// Send interview scheduled email
export const sendInterviewEmail = async (seekerEmail, seekerName, interviewDetails, jobTitle, companyName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'CareerConnect'}" <${process.env.EMAIL_USER}>`,
            to: seekerEmail,
            subject: `Interview Scheduled - ${jobTitle} at ${companyName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 10px 10px 0 0;
                        }
                        .content {
                            background: white;
                            padding: 30px;
                            border-radius: 0 0 10px 10px;
                        }
                        .detail-box {
                            background: #f8f9fa;
                            padding: 15px;
                            margin: 10px 0;
                            border-left: 4px solid #667eea;
                            border-radius: 4px;
                        }
                        .detail-label {
                            font-weight: bold;
                            color: #667eea;
                            margin-bottom: 5px;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 30px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Interview Scheduled!</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${seekerName},</p>
                            <p>Congratulations! You have been shortlisted for an interview.</p>
                            
                            <h3>Interview Details:</h3>
                            
                            <div class="detail-box">
                                <div class="detail-label">Company</div>
                                <div>${companyName}</div>
                            </div>
                            
                            <div class="detail-box">
                                <div class="detail-label">Position</div>
                                <div>${jobTitle}</div>
                            </div>
                            
                            <div class="detail-box">
                                <div class="detail-label">Date</div>
                                <div>${new Date(interviewDetails.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</div>
                            </div>
                            
                            <div class="detail-box">
                                <div class="detail-label">Time</div>
                                <div>${interviewDetails.time}</div>
                            </div>
                            
                            <div class="detail-box">
                                <div class="detail-label">Interview Type</div>
                                <div style="text-transform: capitalize;">${interviewDetails.type}</div>
                            </div>
                            
                            <div class="detail-box">
                                <div class="detail-label">${interviewDetails.type === 'online' ? 'Meeting Link' : 'Location'}</div>
                                <div>${interviewDetails.location}</div>
                            </div>
                            
                            ${interviewDetails.message ? `
                            <div class="detail-box">
                                <div class="detail-label">Message from Company</div>
                                <div>${interviewDetails.message}</div>
                            </div>
                            ` : ''}
                            
                            <p style="margin-top: 20px;">
                                <strong>Please confirm your attendance by logging into your CareerConnect dashboard.</strong>
                            </p>
                            
                            <center>
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/seeker/dashboard" class="button">
                                    View in Dashboard
                                </a>
                            </center>
                            
                            <p style="margin-top: 30px;">Good luck with your interview!</p>
                            
                            <p>Best regards,<br>The CareerConnect Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply to this message.</p>
                            <p>&copy; ${new Date().getFullYear()} CareerConnect. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Interview email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending interview email:', error);
        return { success: false, error: error.message };
    }
};

// Send application status update email
export const sendStatusUpdateEmail = async (seekerEmail, seekerName, status, jobTitle, companyName) => {
    try {
        const transporter = createTransporter();

        let subject = '';
        let message = '';
        let emoji = '';

        switch (status) {
            case 'reviewing':
                subject = `Application Under Review - ${jobTitle}`;
                message = 'Your application is currently being reviewed by our team.';
                emoji = '👀';
                break;
            case 'accepted':
                subject = `Congratulations! Application Accepted - ${jobTitle}`;
                message = 'We are pleased to inform you that your application has been accepted!';
                emoji = '🎉';
                break;
            case 'rejected':
                subject = `Application Update - ${jobTitle}`;
                message = 'Thank you for your interest. Unfortunately, we have decided to move forward with other candidates at this time.';
                emoji = '📋';
                break;
            default:
                subject = `Application Status Update - ${jobTitle}`;
                message = 'Your application status has been updated.';
                emoji = '📬';
        }

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'CareerConnect'}" <${process.env.EMAIL_USER}>`,
            to: seekerEmail,
            subject: subject,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 10px 10px 0 0;
                        }
                        .content {
                            background: white;
                            padding: 30px;
                            border-radius: 0 0 10px 10px;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 30px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${emoji} Application Update</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${seekerName},</p>
                            <p>${message}</p>
                            <p><strong>Position:</strong> ${jobTitle}<br>
                            <strong>Company:</strong> ${companyName}</p>
                            
                            <center>
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/seeker/dashboard" class="button">
                                    View Dashboard
                                </a>
                            </center>
                            
                            <p style="margin-top: 30px;">Best regards,<br>The CareerConnect Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply to this message.</p>
                            <p>&copy; ${new Date().getFullYear()} CareerConnect. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Status update email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending status update email:', error);
        return { success: false, error: error.message };
    }
};
