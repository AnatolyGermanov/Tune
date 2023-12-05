const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропустить текущий трек'),

    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id)
        let player = connection?.state.subscription?.player;
        let resource = player?.state.resource;
        if (!resource){
            const skipEmbed = createEmbed('Сейчас ничего не играет')
            await interaction.reply({embeds: [skipEmbed]});
            return;
        }
        player.stop()
        const skipEmbed = createEmbed('Трек пропущен')
        await interaction.reply({embeds: [skipEmbed]});
    },
};

function createEmbed(description){    
    const Embed = new EmbedBuilder()
        .setColor(0xc44f7c)
        .setDescription(description)
    
    return Embed;
}
