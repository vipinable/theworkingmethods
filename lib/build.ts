import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput, Token, Lazy, EncodingOptions, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'; 
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as acw from 'aws-cdk-lib/aws-cloudwatch';
import * as path from 'path';
export class MainStack extends Stack {
  public fnUrl: string

  //BeginStackDefinition
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    console.log('accessing context 👉', this.node.tryGetContext('fromApp'));

    // //Lambda layer creation definition
    // const layer0 = new lambda.LayerVersion(this, 'LayerVersion', {
    //   compatibleRuntimes: [
    //     lambda.Runtime.PYTHON_3_6,
    //     lambda.Runtime.PYTHON_3_7,
    //     lambda.Runtime.PYTHON_3_8,
    //   ],
    //   code: lambda.Code.fromAsset(path.join(__dirname,'../../layer/bin')),
    //   });

    const healthchecklg = new logs.LogGroup(this, 'healthchecklg',{
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.THREE_MONTHS
    });

    const defaultlogstream = new logs.LogStream(this, 'defaultlogstream', {
      logGroup: healthchecklg,
      logStreamName: 'defaultlogstream',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // const metric = new acw.Metric(this, 'metric', {
    //   namespace: 'AWS/Logs',
    //   metricName: IncomingLogEvents,
    //   period: 600,
    //   statistic: 'Sum'
    // })

    const healthcheckalarm = new acw.Alarm(this, 'healthcheckalarm', {
      comparisonOperator: acw.ComparisonOperator.LESS_THAN_THRESHOLD,
      threshold: 6,
      evaluationPeriods: 3,
      metric: new acw.Metric({
        namespace: 'AWS/Logs',
        metricName: 'IncomingLogEvents',
        period: Duration.seconds(600),
        statistic: 'Sum'
      })
    });

    const s3Bucket = new s3.Bucket(this, 'healthcheck', {
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
    });

    s3Bucket.grantRead(new iam.AccountRootPrincipal());
    s3Bucket.grantPut(new iam.AccountRootPrincipal());
          
    //Index function definition
    const healthcheckfn = new lambda.Function(this, 'healthcheckfn', {
      description: 'healthcheck function',
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'main.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      // layers: [layer0],
      environment: {
        APPNAME: process.env.ApplicationName!,
        ENVNAME: process.env.Environment!, 
      },
      });
    
      healthcheckfn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [
        s3Bucket.arnForObjects("*"),
        s3Bucket.bucketArn
      ],
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:ListBucket'
      ],
      }));

  //EndStack
  }}
