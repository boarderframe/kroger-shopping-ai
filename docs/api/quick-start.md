# Quick Start

Public APIs are available for all clients to build new products, services, or customer experiences that leverage the unique data, functions, and applications of Kroger. To begin using Public APIs right away, complete the following steps:

## 1. Create an Account
Before you can register your application and begin making API requests, you must first Create an Account. After completing the account creation form, you will be asked to verify your account by email. Once you have verified your account, you can continue and register your first application.

## 2. Register Your Application
Once you have created an account, you need to Register Your Application to generate your application's OAuth2 client credentials.

Your client credentials should be treated the same as a username and password. You should never share your credentials with anyone or store them in a place that can be accessed by anyone but the application owner. If your credentials become compromised, you should delete your application and register for new credentials.

## 3. Make a Test Call
To make a test call using your OAuth2 credentials, base64 encode your client ID and client secret with a single colon in between the two (CLIENT_ID:CLIENT_SECRET). Place your encoded credentials in the authorization header using type Basic (see following example). Once you have included the authorization header in the request, you can execute the call from your terminal.

```bash
curl -X POST \
  'https://api.kroger.com/v1/connect/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Authorization: Basic {{base64(CLIENT_ID:CLIENT_SECRET)}}' \
  -d 'grant_type=client_credentials'
```

After you execute the request, the server authenticates your application, and an access token is returned as a JSON response. Once you receive an access token response, you have successfully tested that your client credentials are registered.

## 4. Review Additional Resources
After you have registered your application and tested your credentials, you are ready to integrate. The following is a list of useful resources that covers all aspects of our Public APIs and includes helpful tips for integration.

| Category | Description |
|----------|-------------|
| Security | Everything you need to understand and implement Kroger API authorization and authentication. |
| Cart API | Additional docs related to the Cart API. |
| Identity API | Additional docs related to the Identity API. |
| Locations API | Additional docs related to the Locations API. |
| Products API | Additional docs related to the Products API. |
| Check Your Knowledge | Once you've reviewed the available APIs, use this fun activity to check your knowledge of the Kroger Co.'s Public APIs. |