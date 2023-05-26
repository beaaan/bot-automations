const fs = require('fs');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');

const config = require('./config.json');

var user = new SteamUser();
var bot = new SteamUser();
var accounts = [];

var id3s = [];

fs.readFileSync("accounts.txt").toString().split(/\r\n|\r|\n/).forEach((line) => {
    var a = line.split(":");
    if (a.length != 2) {
        throw("Invalid accounts file format");
    }

    accounts.push({
        "login": a[0],
        "password": a[1]
    });
});

console.log("%d accounts loaded", accounts.length);
console.log("Logging onto main account");

user.logOn({
    accountName: config.login,
    password: config.password
});

work = async(idx) => {
    return new Promise((resolve, reject) => {
        console.log('Logging onto bot #%d', idx + 1);

        bot.logOn({
            accountName: accounts[idx].login,
            password: accounts[idx].password
        });
    
        bot.on('loggedOn', async() => {
            console.log("Logged onto %s", bot.steamID.getSteamID64());
            console.log('Sending a friend request from main account');
    
            id3s.push(bot.steamID.getSteam3RenderedID().slice(5, -1));
        
            await user.addFriend(bot.steamID).catch(() => {});
            await bot.addFriend(user.steamID).catch(() => {});
            
            var str_name = (config.display_format ? config.display_format : "$id$").replace(/\$id\$/g, (idx + 1).toString());

            console.log('Changing display name to %s',  str_name);

            bot.setPersona(SteamUser.EPersonaState.Online, str_name);
        
            console.log('Done, logging out\n');
            
            bot.logOff();
        });
        
        bot.on('disconnected', () => {
            bot.removeAllListeners();
            resolve("done");
        });
    });
};

createUserdataFolders = async() => {
    console.log('Attempting to create userdata folders');
    for (var i = 0; i < id3s.length; i++) {
        fs.cpSync('./userdata', config.steam_path + "/userdata/" + id3s[i], {recursive: true});
    }
};

loggedOn = async() => {
    console.log('Logged on as %s\n', user.steamID.getSteamID64());

    id3s.push(user.steamID.getSteam3RenderedID().slice(5, -1));

    for (var i = 0; i < accounts.length; i++) {
        await work(i);
    }

    if (config.create_userdata_folders) {
        createUserdataFolders();
    }

    console.log("Everything's done, enjoy!");

    user.removeAllListeners();
    user.logOff();

    return;
};

steamGuard = async(domain, callback) => {
    callback(SteamTotp.generateAuthCode(config.shared_secret));
};

err = (error) => {
    user.removeAllListeners();
    throw(error);
};

user.on('error', err);
user.on('loggedOn', loggedOn);

if (config.shared_secret && config.shared_secret != "") {
    user.on('steamGuard', steamGuard);
}