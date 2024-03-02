import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput, Token, Lazy, EncodingOptions, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'; 
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as acw from 'aws-cdk-lib/aws-cloudwatch';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as path from 'path';
export class MainStack extends Stack {
  public fnUrl: string
  public topicArn: string = `arn:aws:sns:us-east-1:${process.env.CDK_DEFAULT_ACCOUNT}:emailTopic`

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

    const healthcheckalarm = new acw.Alarm(this, 'healthcheckalarm', {
      comparisonOperator: acw.ComparisonOperator.LESS_THAN_THRESHOLD,
      threshold: 6,
      evaluationPeriods: 3,
      treatMissingData: acw.TreatMissingData.BREACHING,
      metric: new acw.Metric({
        namespace: 'AWS/Logs',
        metricName: 'IncomingLogEvents',
        period: Duration.seconds(300),
        statistic: 'Sum',
        dimensionsMap: { LogGroupName: healthchecklg.logGroupName },
      })
    });

    const AlarmTopic = sns.Topic.fromTopicArn(this, 'AlarmTopic', this.topicArn)
    healthcheckalarm.addAlarmAction(new cw_actions.SnsAction(AlarmTopic));

    // const s3Bucket = new s3.Bucket(this, 'healthcheck', {
    //   objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    //   encryption: s3.BucketEncryption.S3_MANAGED,
    //   enforceSSL: true,
    //   versioned: false,
    // });

    // s3Bucket.grantRead(new iam.AccountRootPrincipal());
    // s3Bucket.grantPut(new iam.AccountRootPrincipal());
          
    //Index function definition
    const emailfn = new lambda.Function(this, 'healthcheckfn', {
      description: 'Function sends email using SES',
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'main.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      // layers: [layer0],
      environment: {
        APPNAME: process.env.ApplicationName!,
        ENVNAME: process.env.Environment!, 
      },
      });
    
      emailfn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: [
        "CloudWatch:SetAlarmState",
        "secretsmanager:GetSecretValue",
        "kms:GetPublicKey",
        "kms:Decrypt",
        "ses:SendEmail",
        "ssm:GetParameter*"
      ],
      }));

    healthcheckalarm.addAlarmAction(new cw_actions.LambdaAction(emailfn));
    // healthcheckalarm.addOkAction(new cw_actions.LambdaAction(emailfn))
    // healthcheckalarm.addInsufficientDataAction(new cw_actions.LambdaAction(emailfn))

  //EndStack
  }}
