import logging
import boto3
import base64
import json
import os
from botocore.exceptions import ClientError
from botocore.config import Config
import uuid
import jinja2

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create service clients
session = boto3.session.Session()
s3 = session.client('s3')
sts = session.client('sts')
s3c = session.client('s3control',region_name='us-east-1')

def handler(event, context):
    
    logger.info("An event received %s" % (event))
    logger.info("Response received")
