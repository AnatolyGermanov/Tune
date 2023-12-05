const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require("@discordjs/voice");

const { queues } = require('../../data');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Пригласить бота в ваш текущий голосовой канал'),

    async execute(interaction) {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            const joinFirstEmbed = createJoinFirstEmbed()
            await interaction.reply({embeds: [joinFirstEmbed], ephemeral: true});
            return;
        }
        
        let connection = getVoiceConnection(interaction.guild.id);
        
        if (connection?.joinConfig.channelId === channel.id) {
            const alreadyInChannelEmbed = createAlreadyInChannelEmbed(channel)
            await interaction.reply({embeds: [alreadyInChannelEmbed], ephemeral: true});
            return;
        }

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            setUpConnectionHandlers(interaction, connection)
        }
        else {
            connection.rejoin({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
        }
        
        const joinEmbed = createJoinEmbed(channel)
        await interaction.reply({embeds: [joinEmbed], ephemeral: true});
    },
};

function setUpConnectionHandlers(interaction, connection){
    // Обработчики
    connection.on(VoiceConnectionStatus.Signalling, () => {
        console.log('Signalling!');
    });
    connection.on(VoiceConnectionStatus.Connecting, () => {
        console.log('Connecting!');
    });
    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log('Ready!');
    });
    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        console.log('Disconnected!');
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 1_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 1_000),
            ]);
        } catch (error) {
            connection.destroy();
        }
    });
    connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log('Destroyed!');

        clearAllData(interaction)
    });
}

function createJoinFirstEmbed() {
    const Embed = new EmbedBuilder()
        .setColor(0xc44f7c)
        .setDescription(`Зайдите в голосовой канал первым`)
    
    return Embed;
}

function clearAllData(interaction){
    queues.delete(interaction.guild.id)
}

function createAlreadyInChannelEmbed(channel){
    const Embed = new EmbedBuilder()
        .setColor(0xc44f7c)
        .setDescription(`Бот уже в голосовом канале '${channel.name}'`)
    
    return Embed;
}

function createJoinEmbed(channel) {
    const Embed = new EmbedBuilder()
        .setColor(0xc44f7c)
        .setDescription(`Бот зашел в голосовой канал '${channel.name}'`)
    
    return Embed;
}