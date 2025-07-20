const { EmbedBuilder, ActivityType } = require('discord.js');
const os = require('os');

// Fungsi untuk mendapatkan penggunaan CPU
function getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
        for (const type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    }

    return {
        idle: totalIdle / cpus.length,
        total: totalTick / cpus.length
    };
}

// Fungsi untuk mendapatkan penggunaan RAM
function getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usedPercentage = (used / total) * 100;
    
    return {
        total: formatBytes(total),
        used: formatBytes(used),
        free: formatBytes(free),
        percentage: usedPercentage.toFixed(2)
    };
}

// Fungsi untuk format bytes ke ukuran yang lebih mudah dibaca
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fungsi untuk format waktu (menggantikan moment)
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    return `${days} hari, ${hours % 24} jam, ${minutes % 60} menit, ${seconds % 60} detik`;
}

// Fungsi untuk mendapatkan uptime server
function getUptime() {
    return formatDuration(os.uptime() * 1000);
}

// Fungsi untuk mendapatkan uptime bot
function getBotUptime(client) {
    return formatDuration(client.uptime);
}

// Fungsi untuk mendapatkan ping bot
function getBotPing(client) {
    return `${client.ws.ping}ms`;
}

// Fungsi untuk membuat status bot
async function createStatusEmbed(client) {
    // Mendapatkan informasi server
    const memory = getMemoryUsage();
    const serverUptime = getUptime();
    
    // Mendapatkan informasi bot yang akurat
    const ping = Math.round(client.ws.ping); // Ping dalam ms
    const botUptime = formatDuration(client.uptime);
    
    // Mendapatkan jumlah server
    const serverCount = client.guilds.cache.size;
    
    // Menghitung total user dan channel yang akurat
    let userCount = 0;
    let channelCount = 0;
    
    try {
        // Menghitung user
        if (client.guilds.cache.size > 0) {
            // Menghitung semua member di guild pertama
            const guild = client.guilds.cache.first();
            if (guild) {
                try {
                    // Coba dapatkan jumlah member dari guild
                    userCount = guild.memberCount || 0;
                } catch (err) {
                    console.error("Error mendapatkan member count:", err);
                }
            }
        }
        
        // Menghitung channel
        channelCount = client.channels.cache.size;
    } catch (err) {
        console.error("Error saat menghitung statistik:", err);
    }
    
    // Membuat progress bar untuk RAM
    const ramBarLength = 20;
    const ramFilledLength = Math.round((memory.percentage / 100) * ramBarLength);
    const ramBar = '█'.repeat(ramFilledLength) + '░'.repeat(ramBarLength - ramFilledLength);
    
    // Membuat embed untuk status bot
    const statusEmbed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('📊 Status Server Bot')
        .setDescription('```yaml\nInformasi status server dan bot saat ini```')
        .addFields(
            { name: '🤖 Bot Info', value: 
                `\`\`\`
⏱️ Uptime    : ${botUptime}
📶 Ping      : ${ping}ms
🏠 Servers   : ${serverCount}
👥 Users     : ${userCount}
📢 Channels  : ${channelCount}
\`\`\``, inline: false },
            { name: '💻 Server Info', value: 
                `\`\`\`
🖥️ Platform  : ${os.platform()} ${os.arch()}
💾 RAM Usage : ${memory.used} / ${memory.total} (${memory.percentage}%)
${ramBar}
⏱️ Uptime    : ${serverUptime}
🧠 CPU       : ${os.cpus()[0].model}
\`\`\``, inline: false }
        )
        .setFooter({ text: `${client.user.username} • Terakhir diperbarui`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
    
    return statusEmbed;
}

// Fungsi untuk memperbarui status bot
async function updateBotStatus(client, channelId) {
    try {
        // Mendapatkan channel untuk status bot
        const channel = await client.channels.fetch(channelId).catch((err) => {
            console.error(`Error saat mengambil channel status: ${err.message}`);
            return null;
        });
        
        if (!channel) {
            console.error(`Channel dengan ID ${channelId} tidak ditemukan!`);
            return;
        }
        
        // Refresh cache guild untuk data yang lebih akurat
        try {
            await client.guilds.fetch();
        } catch (err) {
            console.error(`Error saat refresh guild cache: ${err.message}`);
        }
        
        // Membuat embed status bot
        const statusEmbed = await createStatusEmbed(client);
        
        // Mencari pesan status bot sebelumnya
        let statusMessage = null;
        try {
            const messages = await channel.messages.fetch({ limit: 10 });
            statusMessage = messages.find(msg => 
                msg.author.id === client.user.id && 
                msg.embeds.length > 0 && 
                msg.embeds[0].title === '📊 Status Server Bot'
            );
        } catch (err) {
            console.error(`Error saat mencari pesan status: ${err.message}`);
        }
        
        // Jika pesan status sebelumnya ditemukan, edit pesan tersebut
        // Jika tidak, kirim pesan baru
        try {
            if (statusMessage) {
                await statusMessage.edit({ embeds: [statusEmbed] });
            } else {
                await channel.send({ embeds: [statusEmbed] });
            }
        } catch (err) {
            console.error(`Error saat mengirim/edit pesan status: ${err.message}`);
            // Coba kirim pesan baru jika edit gagal
            try {
                await channel.send({ embeds: [statusEmbed] });
            } catch (innerErr) {
                console.error(`Juga gagal mengirim pesan baru: ${innerErr.message}`);
            }
        }
        
        // Set aktivitas bot
        try {
            client.user.setPresence({
                activities: [{ 
                    name: `${client.guilds.cache.size} server | ${client.users.cache.size} user`, 
                    type: ActivityType.Watching 
                }],
                status: 'online'
            });
        } catch (err) {
            console.error(`Error saat set presence: ${err.message}`);
        }
        
        console.log(`Status bot berhasil diperbarui pada: ${new Date().toLocaleString()}`);
    } catch (error) {
        console.error(`Terjadi kesalahan saat memperbarui status bot: ${error.message}`);
        throw error; // Re-throw error untuk ditangkap oleh caller
    }
}

module.exports = {
    updateBotStatus,
    createStatusEmbed
}; 