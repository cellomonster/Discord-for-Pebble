module.exports = [
	{
		"type": "section",
		"items": [
			{
				"type": "heading",
				"defaultValue": "Enter your Discord Token"
			},
			{
				"type": "text",
				"defaultValue": "This watch app will be able to send messages from your account to servers that you are on. The app sends data directly to Discord, your token is never sent anywhere else."
			},
			{
				"type": "input",
				"appKey": "token",
				"defaultValue": "",
				"label": "Token",
				"attributes": {
					"placeholder": "Token",
					"limit": 2000,
				}
			},
			{
				"type": "toggle",
				"appKey": "isABot",
				"label": "This token belongs to a bot",
				"defaultValue": false
			},
			{
				"type": "text",
				"defaultValue": "If you're logging in with a user account, and don't know how to get your token, <a href = \"https://www.youtube.com/watch?v=PlXrkOj3OEs\"> this short video </a> will show you how."
			},
			{
				"type": "submit",
				"defaultValue": "Save"
			}
		]
	},
];