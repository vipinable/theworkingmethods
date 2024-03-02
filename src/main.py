import logging
import boto3
import base64
import json
import os
from botocore.exceptions import ClientError
from botocore.config import Config

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create service clients
session = boto3.session.Session()


def sesmail(subject,html,EmailId):
    # Replace sender@example.com with your "From" address.
    # This address must be verified with Amazon SES.
    SENDER = "AWS Lambda<vipinable@gmail.com>"
    
    # Replace recipient@example.com with a "To" address. If your account 
    # is still in the sandbox, this address must be verified.
    RECIPIENT = EmailId
    
    # Specify a configuration set. If you do not want to use a configuration
    # set, comment the following variable, and the 
    # ConfigurationSetName=CONFIGURATION_SET argument below.
    #CONFIGURATION_SET = "ConfigSet"
    
    # If necessary, replace us-west-2 with the AWS Region you're using for Amazon SES.
    AWS_REGION = "us-east-1"
    
    # The character encoding for the email.
    CHARSET = "UTF-8"
    
    # Create a new SES resource and specify a region.
    client = boto3.client('ses',region_name=AWS_REGION)
    
    # Try to send the email.
    try:
        #Provide the contents of the email.
        response = client.send_email(
            Destination={
                'ToAddresses': [
                    RECIPIENT,
                ],
            },
            Message={
                'Body': {
                    'Html': {
                        'Charset': CHARSET,
                        'Data': html,
                    },
                    'Text': {
                        'Charset': CHARSET,
                        'Data': "BODY_TEXT",
                    },
                },
                'Subject': {
                    'Charset': CHARSET,
                    'Data': subject,
                },
            },
            Source=SENDER,
            # If you are not using a configuration set, comment or delete the
            # following line
            #ConfigurationSetName=CONFIGURATION_SET,
        )
    # Display an error if something goes wrong.	
    except ClientError as e:
        print(e.response['Error']['Message'])
    else:
        print("Email sent! Message ID:"),
        print(response['MessageId'])

def handler(event, context):
    
    logger.info("An event received %s" % (event))
    
    html = f"<html>"
    html = html + f"<h3>Name: {event['alarmData']['alarmName']}</h3>"
    html = html + f"<h3>Status: {event['alarmData']['state']['value']}</h3>"
    html = html + f"<h3>Reason: {event['alarmData']['state']['reason']}</h3>"
    html = html + f"</html>"
    
    subject = f"Cloudwatch - {event['alarmData']['alarmName']} - {event['alarmData']['state']['value']}"
    
    sesmail(subject,html,'vipinable@gmail.com')
    
    return None