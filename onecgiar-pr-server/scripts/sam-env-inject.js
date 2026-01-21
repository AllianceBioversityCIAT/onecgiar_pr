/**
 * Script to dynamically generate template.yaml from .env
 * Reads ALL variables from .env and includes them automatically
 * No need to define specific variables - it's completely dynamic
 */
const fs = require('fs');
const path = require('path');

/**
 * Loads all variables from the .env file
 * @returns {Object} Object with all environment variables
 */
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env file not found.');
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      return;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) {
      envVars[key] = value;
    }
  });

  return envVars;
}

/**
 * Escapes a value to be valid in YAML
 * @param {string} value - Value to escape
 * @returns {string} Escaped value for YAML
 */
function escapeYamlValue(value) {
  // If it contains special characters, wrap in quotes
  if (value.includes(':') || value.includes('#') || value.includes("'") ||
      value.includes('"') || value.includes('\n') || value.includes('\\') ||
      value.includes('{') || value.includes('}') || value.includes('[') ||
      value.includes(']') || value.includes('&') || value.includes('*') ||
      value.includes('!') || value.includes('|') || value.includes('>') ||
      value.includes('%') || value.includes('@') || value.includes('`') ||
      value.startsWith(' ') || value.endsWith(' ')) {
    // Escape single quotes by doubling them and wrap in single quotes
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

/**
 * Generates template.yaml dynamically based on .env
 * Variables are injected directly, without using CloudFormation parameters
 * Supports both ZIP and Docker image deployment
 */
function generateTemplate(useDocker = false) {
  const envVars = loadEnvFile();
  const envKeys = Object.keys(envVars);
  
  // Generate Environment Variables section for Lambda
  let envVarsSection = '';
  envKeys.forEach((envKey) => {
    const escapedValue = escapeYamlValue(envVars[envKey]);
    envVarsSection += `          ${envKey}: ${escapedValue}\n`;
  });

  // Docker image template (no size limit)
  if (useDocker) {
    const template = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: PRMS Reporting API - Lambda Function with API Gateway (Docker)

# ============================================================
# AUTOMATICALLY GENERATED FILE - DO NOT EDIT MANUALLY
# This file is regenerated from .env with: npm run sam:generate
# To add variables, simply add them to the .env file
# ============================================================

Parameters:
  Environment:
    Type: String
    Default: dev
    Description: Environment name (dev, staging, prod)

Globals:
  Function:
    Timeout: 30
    MemorySize: 1024

Resources:
  # Main Lambda Function (Docker Image)
  PrmsReportingFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub 'prstaging-\${Environment}-main'
      PackageType: Image
      Description: PRMS Reporting API Lambda Function
      Environment:
        Variables:
          NODE_ENV: !Ref Environment
          # Variables automatically loaded from .env (${envKeys.length} variables)
${envVarsSection}      Events:
        ApiGateway:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY
            ApiId: !Ref PrmsReportingApi
    Metadata:
      Dockerfile: Dockerfile.lambda
      DockerContext: .
      DockerTag: latest

  # API Gateway HTTP API
  PrmsReportingApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      Name: !Sub 'prstaging-\${Environment}'
      Description: PRMS Reporting API Gateway
      CorsConfiguration:
        AllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - PATCH
          - OPTIONS
          - HEAD
        AllowHeaders:
          - Content-Type
          - X-Amz-Date
          - Authorization
          - X-Api-Key
          - X-Amz-Security-Token
        AllowOrigins:
          - '*'
        MaxAge: 300

  # CloudWatch Log Group
  PrmsReportingLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/prstaging-\${Environment}-main'
      RetentionInDays: 14

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub 'https://\${PrmsReportingApi}.execute-api.\${AWS::Region}.amazonaws.com'
    Export:
      Name: !Sub '\${AWS::StackName}-ApiUrl'
  
  FunctionName:
    Description: Lambda Function Name
    Value: !Ref PrmsReportingFunction
    Export:
      Name: !Sub '\${AWS::StackName}-FunctionName'
  
  FunctionArn:
    Description: Lambda Function ARN
    Value: !GetAtt PrmsReportingFunction.Arn
    Export:
      Name: !Sub '\${AWS::StackName}-FunctionArn'
`;
    return template;
  }

  // ZIP template (original)
  const template = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: PRMS Reporting API - Lambda Function with API Gateway

# ============================================================
# AUTOMATICALLY GENERATED FILE - DO NOT EDIT MANUALLY
# This file is regenerated from .env with: npm run sam:generate
# To add variables, simply add them to the .env file
# ============================================================

Parameters:
  Environment:
    Type: String
    Default: dev
    Description: Environment name (dev, staging, prod)

Globals:
  Function:
    Timeout: 30
    MemorySize: 1024
    Runtime: nodejs20.x

Resources:
  # Main Lambda Function
  PrmsReportingFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub 'prstaging-\${Environment}-main'
      Handler: dist/lambda.handler
      CodeUri: .sam-build/
      Description: PRMS Reporting API Lambda Function
      Environment:
        Variables:
          NODE_ENV: !Ref Environment
          # Variables automatically loaded from .env (${envKeys.length} variables)
${envVarsSection}      Events:
        ApiGateway:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY
            ApiId: !Ref PrmsReportingApi

  # API Gateway HTTP API
  PrmsReportingApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      Name: !Sub 'prstaging-\${Environment}'
      Description: PRMS Reporting API Gateway
      CorsConfiguration:
        AllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - PATCH
          - OPTIONS
          - HEAD
        AllowHeaders:
          - Content-Type
          - X-Amz-Date
          - Authorization
          - X-Api-Key
          - X-Amz-Security-Token
        AllowOrigins:
          - '*'
        MaxAge: 300

  # CloudWatch Log Group
  PrmsReportingLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/prstaging-\${Environment}-main'
      RetentionInDays: 14

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub 'https://\${PrmsReportingApi}.execute-api.\${AWS::Region}.amazonaws.com'
    Export:
      Name: !Sub '\${AWS::StackName}-ApiUrl'
  
  FunctionName:
    Description: Lambda Function Name
    Value: !Ref PrmsReportingFunction
    Export:
      Name: !Sub '\${AWS::StackName}-FunctionName'
  
  FunctionArn:
    Description: Lambda Function ARN
    Value: !GetAtt PrmsReportingFunction.Arn
    Export:
      Name: !Sub '\${AWS::StackName}-FunctionArn'
`;

  return template;
}

/**
 * Saves the generated template.yaml
 * @param {boolean} useDocker - Whether to use Docker image deployment
 */
function saveTemplate(useDocker = false) {
  const template = generateTemplate(useDocker);
  const templatePath = path.join(__dirname, '..', 'template.yaml');
  fs.writeFileSync(templatePath, template);
  const envCount = Object.keys(loadEnvFile()).length;
  const mode = useDocker ? '(Docker image)' : '(ZIP)';
  console.log(`✅ template.yaml generated with ${envCount} environment variables ${mode}`);
}

/**
 * Gets .env variables as an object
 */
function getEnvVars() {
  return loadEnvFile();
}

/**
 * Gets the variable count
 */
function getEnvVarsCount() {
  return Object.keys(loadEnvFile()).length;
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const useDocker = args.includes('--docker');
  
  if (args.includes('--generate-template') || args.includes('-g')) {
    saveTemplate(useDocker);
  } else if (args.includes('--list') || args.includes('-l')) {
    const envVars = loadEnvFile();
    console.log('Variables found in .env:');
    Object.keys(envVars).forEach((key, index) => {
      console.log(`  ${index + 1}. ${key}`);
    });
    console.log(`\nTotal: ${Object.keys(envVars).length} variables`);
  } else {
    console.log('Usage:');
    console.log('  --generate-template, -g  Generate template.yaml from .env');
    console.log('  --docker                 Use Docker image deployment (with -g)');
    console.log('  --list, -l               List variables from .env');
  }
}

module.exports = {
  loadEnvFile,
  generateTemplate,
  saveTemplate,
  getEnvVars,
  getEnvVarsCount,
  escapeYamlValue
};
