// Import AWS SDK and create instances of SNS and SQS
const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const sqs = new AWS.SQS();

// Function to validate the input
const validateInput = (body) => {
  const { type, recipients, message, sender } = body;
  return (
    type &&
    (type === 'sms' || type === 'email') &&
    Array.isArray(recipients) &&
    recipients.length > 0 &&
    message &&
    sender
  );
};

// Function to send the notification using SNS
const sendNotification = async (event) => {
  try {
    const body = JSON.parse(event.body);
    console.log('Event data:', event);

    // Validate the input
    if (!validateInput(body)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid input' }),
      };
    }

    const { type, recipients, message, sender } = body;

    const TopicArn = process.env.NOTIFICATION_SNS_TOPIC_ARN;
    const Message = JSON.stringify({ type, recipients, message, sender });

    // Publish the message to the SNS topic
    await sns.publish({ TopicArn, Message }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification sent' }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

// Function to send SMS
const sendSms = async (phoneNumber, message, senderId) => {
  // Implementation of sending SMS using AWS SNS or other services
  const params = {
    PhoneNumber: phoneNumber,
    Message: message,
    MessageAttributes: {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: senderId,
      },
    },
  };

  return sns.publish(params).promise();
};

// Function to send Email
const sendEmail = async (emailAddress, message, senderEmail) => {
  // Implementation of sending Email using AWS SES or other services
  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [emailAddress],
    },
    Message: {
      Subject: {
        Data: 'Email notification from Notification Microservice',
      },
      Body: {
        Text: {
          Data: message,
        },
      },
    },
  };

  return ses.sendEmail(params).promise();
};

// Function to process the notifications and send SMS or emails
const processNotification = async (event) => {
  try {
    // Iterate through the SQS records
    for (const record of event.Records) {
      const { body } = record;
      const { type, recipients, message, sender } = JSON.parse(body);

      // Create an array of tasks for sending SMS or emails
      const tasks = recipients.map((recipient) => {
        if (type === 'sms') {
          return sendSms(recipient, message, sender);
        } else if (type === 'email') {
          return sendEmail(recipient, message, sender);
        }
      });

      // Execute all tasks in parallel
      await Promise.all(tasks);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notifications processed' }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

// Export the functions
module.exports = { sendNotification, processNotification };
