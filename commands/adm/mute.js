const { mentionById } = require("../../utils/functions.js");
const { MessageEmbed } = require("discord.js");
const ms = require("ms");

module.exports.run = async (bot, message, args, lang) => {
    
    try{
        let cmd = args[0];
        if(cmd === "show"){
            let mutes = await bot.database.find("mute", { 'guildId': message.guild.id });
            let description = "";

            if(mutes) {
                mutes.forEach(element => {
                    description = description + `**User:** ${mentionById(element.userId)} - **Executor:** ${mentionById(element.executor)} - **Date Unmute:** \`${new Date(element.date * 1)}\`\n`
                });
            }else description = lang.mutesNull;

            const embed = new MessageEmbed()
            .setTitle(`Mutes`)
            .setDescription(description)
            .setTimestamp()
            .setColor(bot.baseColor);
    
            return message.channel.send(embed);
        }
        else if(cmd === "remove"){
            let mutedUser =  message.guild.member(message.mentions.users.first() || message.guild.member(args[1]));
            if(!mutedUser) return message.reply(lang.returnNull);

            if((message.member.roles.highest.rawPosition <= mutedUser.roles.highest.rawPosition) || (mutedUser.hasPermission("ADMINISTRATOR"))){
                return message.reply(lang.highRole);
            }

            let muterole = message.guild.roles.cache.find(role => role.name === "Muted");
            if (!mutedUser.roles.cache.find(role => role.name === "Muted")) return message.channel.send(lang.muteFalse)

            await bot.database.findOneAndRemove("mute", { 'guildId': message.guild.id, 'userId': mutedUser.user.id })
            mutedUser.roles.remove(muterole);
            
            return message.reply(`${mutedUser} ${lang.unmuted}`);
        }

        let toMute = message.guild.member(message.mentions.users.first() || message.guild.member(cmd));
        if(!toMute) return message.reply(lang.returnNull);
        
        if((message.member.roles.highest.rawPosition <= toMute.roles.highest.rawPosition) || (toMute.hasPermission("ADMINISTRATOR"))){
            return message.reply(lang.highRole);
        }
   
        let muterole = await message.guild.roles.cache.find(role => role.name === "Muted");
        if (toMute.roles.cache.find(role => role.name === "Muted")) return message.channel.send(lang.isMuted)

        let mutetime = args[1];
        if(!mutetime) return message.reply(lang.returnInvalid)
        if(isNaN(args[1].substring(0, args[1].length-1)) && isNaN(args[1].charAt(args[1].length-1))) return message.reply(lang.returnInvalid)
        mutetime = ms(mutetime);

        if(!muterole) muterole = await message.guild.roles.create({ data: { name: 'Muted', color: "#000000", permissions: [] } });

        await message.guild.channels.cache.forEach(async (channel, id) => {
            await channel.createOverwrite(muterole, 
                {
                    SEND_MESSAGES: false,
                    ADD_REACTIONS: false
                }
            );
        })

        await(toMute.roles.add(muterole.id));
        muteDB(bot, mutetime, message.guild.id, toMute.user.id, message.member.user.id);

        message.reply(`<@${toMute.id}> ${lang.returnMuted} ${ms(mutetime)}`)

        setTimeout(async function(){
            toMute.roles.remove(muterole.id);
            await bot.database.findOneAndRemove("mute", { 'guildId': message.guild.id, 'userId': toMute.user.id })

            message.channel.send(`<@${toMute.id}> ${lang.returnRemoveMute}`);
        }, mutetime);
    }catch(e){
        bot.error.errorReturn(e, message, this.help.name)
    }
}

async function muteDB(bot, mutetime, idGuild, idUser, idExecutor){
    let time = new Date().getTime();
    time = time + mutetime;

    const model = await bot.database.create("mute", {
        guildId: idGuild,
        userId: idUser,
        date: time,
        executor: idExecutor,
        reason: "null"
    })

    bot.database.save(model);
}

module.exports.help = {
    name: "mute",
    type: "adm"
}

module.exports.requirements = {
    userPerms: ["MUTE_MEMBERS"],
    clientPerms: ["ADMINISTRATOR"],
    ownerOnly: false
}