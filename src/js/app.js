var UI = require('ui');
var Voice = require('ui/voice');
var Vector2 = require('vector2');
var Motor = require('ui/vibe');
var Settings = require('settings');
var Clay = require('clay');
var clayConfig = require('config');
var clay = new Clay(clayConfig, null, {autoHandleEvents: false});

var token = "";
var isABot = false;
var servers = [];
var channels = [];
var dmChannels = [];
var messages = [];
var selectedChannel;
var inChatList = false;

Pebble.addEventListener('showConfiguration', function(e) {
	Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function(e) {
	if (e && !e.response) {
		return;
	}
	var dict = clay.getSettings(e.response);
	console.log("Message to send:" + JSON.stringify(dict));
	Settings.option(dict);
});

token = Settings.option('token');
isABot = Settings.option('isABot');
console.log("Got Settings: " + token + ", " + isABot);

var loadingCard = new UI.Card({
	fullscreen:true, 
	title: 'Loading...',
	titleColor: 'orange'
});

if(!token){
	loadingCard.title("Oops!");
	loadingCard.subtitle("Enter your Discord token in the app settings!");
	console.log("No token!");
}

loadingCard.show();

var serverMenu = new UI.Menu({
	fullscreen:true,
	backgroundColor: 'liberty',
	textColor: 'white',
	highlightBackgroundColor: 'indigo',
	highlightTextColor: 'white',
	sections: [
		{title: 'Servers'},
	]
});

if(!isABot){
	serverMenu.section(0, {title: 'DMs'});
	serverMenu.section(1, {title: 'Servers'});
}

var channelMenu = new UI.Menu({
	fullscreen:true,
	backgroundColor: 'liberty',
	textColor: 'white',
	highlightBackgroundColor: 'indigo',
	highlightTextColor: 'white',
	sections: [{
	  title: 'Channels',
	  items: [{}]
	}]
});

var chatList = new UI.Card({
	fullscreen:true, 
	scrollable:true,
	title: 'Loading...',
	titleColor: 'orange',
	subtitleColor: 'chrome yellow',
	bodyColor: 'black',
});

serverMenu.on("select", function(selection) {
	channels = [];
	channelMenu.items(0, {title:"Loading..."});
	var j = 0;
	if(selection.sectionIndex || isABot)
		for(var i = 0; i < servers[selection.itemIndex].channels.length; i++){
			if(!servers[selection.itemIndex].channels[i].type){
				channels.push(servers[selection.itemIndex].channels[i]);
				channelMenu.item(0, j, {
					title: servers[selection.itemIndex].channels[i].name, 
					subtitle: servers[selection.itemIndex].channels[i].topic
				});
				j++;
			}
		}
	else
		for(var i = 0; i < dmChannels.length; i++){
			channels.push(dmChannels[i]);
			if(dmChannels[i].recipients.length > 1){
				var members = "";
				for(var m = 0; m < dmChannels[i].recipients.length; m++)
					members += dmChannels[i].recipients[m].username + ", ";
				channelMenu.item(0, j, {
					title: "Group with " + dmChannels[i].recipients[0].username,
					subtitle: members
				});
			}else
				channelMenu.item(0, j, {title: dmChannels[i].recipients[0].username});
			j++;
		}
	channelMenu.show();
});

channelMenu.on("select", function(selection){
	messages = [];
	console.log("Selected Channel!");
	
	selectedChannel = channels[selection.itemIndex].id;
	
	var request = new XMLHttpRequest();
	
	request.onload = function() {
		console.log('Got response: ' + this.responseText);
		messages = JSON.parse(this.responseText);
		console.log(JSON.stringify(messages[0]));
		var cardBody = "";
		chatList.title(messages[0].author.username + ":");
		chatList.subtitle(messages[0].content);
		for(var i = 1; i < messages.length; i++)
			cardBody += messages[i].author.username + ":\n" + messages[i].content + "\n";
		if(cardBody.length > 433 - messages[0].author.username.length - messages[0].content.length);
		chatList.body(cardBody.substring(0, 410 - messages[0].author.username.length - messages[0].content.length) + "...");
		console.log("Chat list text length: " + (cardBody.substring(0, 410 - messages[0].author.username.length - messages[0].content.length).length +3));
	};

	request.open("GET", "https://discordapp.com/api/channels/" + selectedChannel + "/messages");
	if(isABot)
		request.setRequestHeader('Authorization', "Bot " + token);
	else
		request.setRequestHeader('Authorization', token);
	request.setRequestHeader('Content-Type', 'application/json');
	request.send();
	chatList.show();
	inChatList = true;
});

chatList.on('click', 'select', function(input){
	inChatList = false;
	Voice.dictate('start', true, function(input) {
		if (input.err) {
			inChatList = true;
			console.log('Error: ' + input.err);
			return;
		}
	
		var message = new XMLHttpRequest();
		
		message.onload = function() {
			console.log('Got response: ' + this.responseText);
		};

		message.open("POST", "https://discordapp.com/api/channels/" + selectedChannel + "/messages");
		if(isABot)
			message.setRequestHeader('Authorization', "Bot " + token);
		else
			message.setRequestHeader('Authorization', token);
		message.setRequestHeader('Content-Type', 'application/json');
		message.send(JSON.stringify({content:input.transcription}));
		inChatList = true;
	});
});

chatList.on('click', 'back', function(input){
	chatList.title('Loading...');
	chatList.subtitle('');
	chatList.body('');
	chatList.hide();
	inChatList = false;
});

var ws = new WebSocket("wss://gateway.discord.gg/?encoding=json&v=7");

ws.addEventListener('open', function (event) {
	console.log("Connected!");
});

ws.addEventListener('message', function (event) {
	var data = JSON.parse(event.data);
	
	if(data.t === "READY"){
		console.log("Ready!");
		serverMenu.show();
		loadingCard.hide();
		if(!isABot){
			console.log(JSON.stringify(data.d.guilds));
			servers = data.d.guilds;
			dmChannels = data.d.private_channels;
			serverMenu.item(0, 0, {title: "Messages", subtitle: "Direct messages"});
			for(var i = 0; i < servers.length; i++){
				serverMenu.item(1, i, {title: data.d.guilds[i].name});
			}
		}
	}
	
	if(data.t === "MESSAGE_CREATE"){
		setTimeout(function(){
			console.log("New Message! Currently in chat list: " + inChatList);
			if(data.d.channel_id == selectedChannel && inChatList){
				Motor.vibrate('short');
				messages.unshift(data.d);
				var cardBody = "";
				chatList.title(messages[0].author.username + ":");
				chatList.subtitle(messages[0].content);
				for(var i = 1; i < messages.length; i++)
					cardBody += messages[i].author.username + ":\n" + messages[i].content + "\n";
				if(cardBody.length > 433 - messages[0].author.username.length - messages[0].content.length);
				chatList.body(cardBody.substring(0, 410 - messages[0].author.username.length - messages[0].content.length) + "...");
				console.log("Length of chat card: " + (410 - messages[0].author.username.length - messages[0].content.length + 3));
			}
		}, 500);
	}
	
	if(data.t === "GUILD_CREATE" && isABot){
		console.log("Got Server: " + data.d.name);
		serverMenu.item(0, servers.length, {title: data.d.name});
		servers.push(data.d);
	}
	console.log(event.data);
	console.log(JSON.stringify(event));
	if(data.op === 10){
		console.log("Heartbeat: " + data.d.heartbeat_interval);
		console.log("Sent Auth!");
		ws.send(JSON.stringify({
			"op": 2,
			"d": {
				"token": token,
				"properties": {
					"$browser": "pebble",
				},
				"large_threshold": 50,
			}
		}));
		
		setInterval(function(){
			console.log("Sent heartbeat!");
			ws.send(JSON.stringify({"op": 1, "d":null}));
		}, data.d.heartbeat_interval - 500);
	}
});