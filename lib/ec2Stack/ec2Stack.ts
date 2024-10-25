import { Stack, StackProps, RemovalPolicy, aws_s3 as s3, } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as path from 'path';

export class EC2Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // IAM Role to access EC2
    const instanceRole = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
    });

    // Network setting for EC2
    const defaultVpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true,
    });

    const chatbotAppSecurityGroup = new ec2.SecurityGroup(this, 'chatbotAppSecurityGroup', {
      vpc: defaultVpc,
    });
    chatbotAppSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'httpIpv4',
    );
    chatbotAppSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'sshIpv4',
    );

    // set AMI
    const machineImage = ec2.MachineImage.fromSsmParameter(
      '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id'
    );
    
    // set User Data
    const userData = ec2.UserData.forLinux();
    const userDataScript = fs.readFileSync(path.join(__dirname, 'userdata.sh'), 'utf8');
    userData.addCommands(userDataScript);
    
    // EC2 instance
    const chatbotAppInstance = new ec2.Instance(this, 'chatbotAppInstance', {
      instanceType: new ec2.InstanceType('m5.large'),
      machineImage: machineImage,
      vpc: defaultVpc,
      securityGroup: chatbotAppSecurityGroup,
      role: instanceRole,
      userData: userData,
    });

    new cdk.CfnOutput(this, 'AdvRagChatbotAppUrl', {
      value: `http://${chatbotAppInstance.instancePublicIp}/`,
      description: 'The URL of chatbot instance generated by AWS Advanced RAG Workshop',
      exportName: 'AdvRagChatbotAppUrl',
    });
  }
}
