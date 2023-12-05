const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Выход из голосового канала'),

    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        if (!connection) {
            const notInChannelEmbed = createEmbed(`Бот не находится в голосовом канале`)
            await interaction.reply({embeds: [notInChannelEmbed], ephemeral: true});
            return;
        }
        
        const channel = await interaction.client.channels.fetch(connection.joinConfig.channelId)
        const leaveEmbed = createEmbed(`Бот покинул голосовой канал '${channel.name}'`)
        await interaction.reply({embeds: [leaveEmbed], ephemeral: true});
        connection.destroy();
    },
};

function createEmbed(description) {
    const Embed = new EmbedBuilder()
        .setColor(0xc44f7c)
        .setDescription(description)
    
    return Embed;
}
