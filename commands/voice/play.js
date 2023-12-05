const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { createAudioPlayer, NoSubscriberBehavior, createAudioResource, AudioPlayerStatus, joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const { stream } = require('play-dl');
const ytdl = require("ytdl-core");
const { Duration } = require('luxon')

const { queues } = require('../../data');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Добавляет трек для проигрывания')
        .addStringOption(option => 
            option.setName('url')
            .setDescription('URL-адрес')
            .setRequired(true)),

    async execute(interaction) {
        const connection = await connectToVoiceChannel(interaction);

        if (!connection)
            return;

        const videoURL = interaction.options.getString('url')
        
        await interaction.deferReply();
        const playEmbed = await createPlayEmbed(videoURL)
        await interaction.editReply({embeds: [playEmbed]});

        let queue = queues.get(interaction.guild.id)
        if (!queue) {
            queue = []
            queues.set(interaction.guild.id, queue)
        }
        queue.push(videoURL)
        
        let player = connection.state.subscription?.player
        if (!player) {
            player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                },
            });
            
            setUpConnectionHandlers(interaction, connection, player);

            connection.subscribe(player);
        }

        if (player.state.status === AudioPlayerStatus.Idle) {
            playNextFromQueue(interaction, connection)
        }
    },
};

async function connectToVoiceChannel (interaction) {
    let connection = getVoiceConnection(interaction.guild.id);
    if (!connection) {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            const joinFirstEmbed = createJoinFirstEmbed()
            await interaction.reply({embeds: [joinFirstEmbed], ephemeral: true});
            return;
        }

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

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
    return connection;
}

function setUpConnectionHandlers(interaction, connection, player){
    // Обработчики
    player.on('error', error => {
        console.error(error);
    });
    player.on(AudioPlayerStatus.Idle, () => {
        console.log('Idle!');

        playNextFromQueue(interaction, connection);
    });
    player.on(AudioPlayerStatus.Buffering, () => {
        console.log('Buffering!');
    });
    player.on(AudioPlayerStatus.Playing, () => {
        console.log('Playing!');
    });
    player.on(AudioPlayerStatus.AutoPaused, () => {
        console.log('AutoPaused!');
    });
    player.on(AudioPlayerStatus.Paused, () => {
        console.log('Paused!');
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

async function playNextFromQueue(interaction, connection){
    let queue = queues.get(interaction.guild.id)
    if (!queue.length){
        return;
    }

    const nextURL = queue.shift()
    const streamURL = await stream(nextURL);
    const resource = createAudioResource(streamURL.stream, {
        inputType: streamURL.type,
        /*inlineVolume: true,*/
    })
    //resource.volume.setVolume(1)

    resource.playStream.on('error', error => {
        console.error(error);
    });

    let player = connection.state.subscription.player;
    player.play(resource);
}

async function createPlayEmbed(videoURL) {
    const videoInfo = await ytdl.getBasicInfo(videoURL)
    const duration = Duration.fromObject({seconds: videoInfo.videoDetails.lengthSeconds})
    const formattedDuration = duration.toFormat('dd:hh:mm:ss')
    const Embed = new EmbedBuilder()
        .setColor(0xc44f7c)
        .setAuthor({name: 'Трек добавлен!'})
        .setTitle(videoInfo.videoDetails.title)
        .setURL(videoInfo.videoDetails.video_url)
        .setDescription(videoInfo.videoDetails.ownerChannelName)
        .setThumbnail(videoInfo.videoDetails.thumbnails[0].url)
        .addFields(
            {name: 'Длительность', value: formattedDuration, inline: true}
        )
    
    return Embed;
}

