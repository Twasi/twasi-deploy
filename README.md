# twasi-deploy
An application to automatically deploy different instances of twasi-core when a new commit is pushed to a specific branch.

## Getting started

### Setup the application
- Clone the repository
- Run 'npm install' to install the dependencies
- Rename the "config.example.json" to "config.json"
- Configurate the application
- Run 'node index.js' to start the application

## Create a GitHub webhook
- Open the settings tab of your twasi-core fork
- Click 'webhooks' on the left
- Create a new webhook:
  - Payload URL: 'http://your-server:8989/' (or another port if you changed that in your config.json)
  - Content Type: 'application/json'
  - Secret: The secret that you configured in the config.json file (You really should use a secure secret)
 
 If the application is running when you create your trigger and everything is set up properly, it will give a success feedback in the console.
 
 ## Workflow
 Every instance should have it's own screen on the server provided under the "deployment-server" section of your config.
 Whenever there is a new push to the repository, the application will search for a configuration for the branch that is being pushed and
 execute a build. Once Twasi was built successfully, it will upload the 'twasi-core.jar' file to the location provided in the configuration.
 After that it will connect to the server via ssh, open the corresponding screen and restart the instance.
