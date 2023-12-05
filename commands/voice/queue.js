const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const ytdl = require('ytdl-core')

const { queues } = require('../../data')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Посмотреть очередь треков'),

    async execute(interaction) {
        const queue = queues.get(interaction.guild.id)  
        const queueEmbed = await createEmbed(queue)
        await interaction.reply({embeds: [queueEmbed]});
    },
};

async function createEmbed(queue) {
    let queueObj;
    if(queue?.length)
    {
        queueObj = await queue.reduce(async (acc, url, index) => {
            const videoInfo = await ytdl.getBasicInfo(url)
            acc = await acc;
            acc.push({name: `\u200B`, value: `${index+1}. ${videoInfo.videoDetails.title}`})
            return acc
        }, [])
    }
    else
        queueObj = [{name: `\u200B`, value: 'Очередь пуста'}]
        
    const Embed = new EmbedBuilder()
        .setColor(0xc44f7c)
        .setDescription(`Очередь`)
        .addFields(...queueObj)
    
    return Embed;
}