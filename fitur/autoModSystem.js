const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// Database untuk menyimpan pelanggaran dan konfigurasi
const violations = new Map();
const modConfig = new Map();
const spamTracker = new Map();

/**
 * Sistem Auto Moderation yang canggih
 * @module autoModSystem
 */

// Konfigurasi default auto mod
const DEFAULT_CONFIG = {
    enabled: true,
    spamProtection: true,
    profanityFilter: true,
    linkProtection: true,
    capsFilter: true,
    duplicateMessageFilter: true,
    maxWarnings: 3,
    muteDuration: 10, // dalam menit
    autoDelete: true,
    logChannel: null,
    exemptRoles: [],
    exemptChannels: []
};

// Daftar kata-kata kasar (contoh, bisa diperluas)
const PROFANITY_WORDS = [
    'anjing', 'babi', 'bangsat', 'bajingan', 'kontol', 'memek', 'ngentot',
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'idiot', 'stupid'
];

// Pattern untuk link detection
const LINK_PATTERNS = [
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
    /discord\.gg\/[a-zA-Z0-9]+/,
    /discord\.com\/invite\/[a-zA-Z0-9]+/,
    /discordapp\.com\/invite\/[a-zA-Z0-9]+/
];

/**
 * Setup sistem auto moderation
 * @param {String} guildId - ID server
 * @param {Object} config - Konfigurasi auto mod
 */
function setupAutoMod(guildId, config = {}) {
    modConfig.set(guildId, { ...DEFAULT_CONFIG, ...config });
    console.log(`Auto moderation setup untuk guild ${guildId}`);
}

/**
 * Cek apakah pesan mengandung spam
 * @param {Message} message - Pesan Discord
 * @returns {Boolean} - True jika spam
 */
function isSpam(message) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = Date.now();
    
    if (!spamTracker.has(guildId)) {
        spamTracker.set(guildId, new Map());
    }
    
    const guildTracker = spamTracker.get(guildId);
    
    if (!guildTracker.has(userId)) {
        guildTracker.set(userId, {
            messages: [],
            lastMessage: '',
            duplicateCount: 0
        });
    }
    
    const userTracker = guildTracker.get(userId);
    
    // Hapus pesan lama (lebih dari 10 detik)
    userTracker.messages = userTracker.messages.filter(msg => now - msg.timestamp < 10000);
    
    // Tambah pesan baru
    userTracker.messages.push({
        content: message.content,
        timestamp: now
    });
    
    // Cek duplicate message
    if (userTracker.lastMessage === message.content) {
        userTracker.duplicateCount++;
    } else {
        userTracker.duplicateCount = 0;
        userTracker.lastMessage = message.content;
    }
    
    // Spam jika lebih dari 5 pesan dalam 10 detik atau 3 pesan duplicate
    return userTracker.messages.length > 5 || userTracker.duplicateCount >= 3;
}

/**
 * Cek apakah pesan mengandung kata kasar
 * @param {String} content - Isi pesan
 * @returns {Boolean} - True jika mengandung profanity
 */
function containsProfanity(content) {
    const lowerContent = content.toLowerCase();
    return PROFANITY_WORDS.some(word => lowerContent.includes(word));
}

/**
 * Cek apakah pesan mengandung link
 * @param {String} content - Isi pesan
 * @returns {Boolean} - True jika mengandung link
 */
function containsLink(content) {
    return LINK_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Cek apakah pesan terlalu banyak huruf kapital
 * @param {String} content - Isi pesan
 * @returns {Boolean} - True jika terlalu banyak caps
 */
function isExcessiveCaps(content) {
    if (content.length < 10) return false;
    
    const capsCount = content.replace(/[^A-Z]/g, '').length;
    const capsPercentage = (capsCount / content.length) * 100;
    
    return capsPercentage > 70; // Lebih dari 70% huruf kapital
}

/**
 * Tambah pelanggaran untuk user
 * @param {String} guildId - ID server
 * @param {String} userId - ID user
 * @param {String} type - Jenis pelanggaran
 * @param {String} reason - Alasan pelanggaran
 */
function addViolation(guildId, userId, type, reason) {
    const key = `${guildId}_${userId}`;
    
    if (!violations.has(key)) {
        violations.set(key, {
            userId: userId,
            guildId: guildId,
            warnings: 0,
            violations: [],
            lastViolation: null
        });
    }
    
    const userViolations = violations.get(key);
    userViolations.warnings++;
    userViolations.violations.push({
        type: type,
        reason: reason,
        timestamp: new Date()
    });
    userViolations.lastViolation = new Date();
    
    violations.set(key, userViolations);
    
    return userViolations.warnings;
}

/**
 * Proses pesan untuk auto moderation
 * @param {Message} message - Pesan Discord
 */
async function processMessage(message) {
    // Skip jika bot atau DM
    if (message.author.bot || !message.guild) return;
    
    const guildId = message.guild.id;
    const config = modConfig.get(guildId);
    
    if (!config || !config.enabled) return;
    
    // Skip jika user memiliki role exempt
    const memberRoles = message.member.roles.cache.map(role => role.id);
    if (config.exemptRoles.some(roleId => memberRoles.includes(roleId))) return;
    
    // Skip jika channel exempt
    if (config.exemptChannels.includes(message.channel.id)) return;
    
    // Skip jika user memiliki permission manage messages
    if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
    
    let violations = [];
    let shouldDelete = false;
    
    // Cek spam
    if (config.spamProtection && isSpam(message)) {
        violations.push({ type: 'SPAM', reason: 'Mengirim pesan terlalu cepat atau duplicate' });
        shouldDelete = true;
    }
    
    // Cek profanity
    if (config.profanityFilter && containsProfanity(message.content)) {
        violations.push({ type: 'PROFANITY', reason: 'Menggunakan kata-kata kasar' });
        shouldDelete = true;
    }
    
    // Cek link
    if (config.linkProtection && containsLink(message.content)) {
        violations.push({ type: 'LINK', reason: 'Mengirim link tanpa izin' });
        shouldDelete = true;
    }
    
    // Cek caps
    if (config.capsFilter && isExcessiveCaps(message.content)) {
        violations.push({ type: 'CAPS', reason: 'Menggunakan terlalu banyak huruf kapital' });
        shouldDelete = true;
    }
    
    // Proses pelanggaran
    if (violations.length > 0) {
        // Hapus pesan jika perlu
        if (shouldDelete && config.autoDelete) {
            try {
                await message.delete();
            } catch (error) {
                console.error('Error menghapus pesan:', error);
            }
        }
        
        // Tambah pelanggaran
        let totalWarnings = 0;
        for (const violation of violations) {
            totalWarnings = addViolation(guildId, message.author.id, violation.type, violation.reason);
        }
        
        // Kirim warning ke user
        await sendWarning(message, violations, totalWarnings, config.maxWarnings);
        
        // Log ke channel jika ada
        if (config.logChannel) {
            await logViolation(message, violations, totalWarnings);
        }
        
        // Ambil tindakan jika mencapai batas warning
        if (totalWarnings >= config.maxWarnings) {
            await takeAction(message, totalWarnings, config);
        }
    }
}

/**
 * Kirim warning ke user
 * @param {Message} message - Pesan Discord
 * @param {Array} violations - Daftar pelanggaran
 * @param {Number} totalWarnings - Total warning
 * @param {Number} maxWarnings - Maksimal warning
 */
async function sendWarning(message, violations, totalWarnings, maxWarnings) {
    const violationList = violations.map(v => `• ${v.reason}`).join('\n');
    
    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Auto Moderation Warning')
        .setDescription(`${message.author}, pesan Anda melanggar aturan server:`)
        .addFields(
            { name: '🚫 Pelanggaran', value: violationList, inline: false },
            { name: '📊 Status Warning', value: `${totalWarnings}/${maxWarnings} warnings`, inline: true }
        )
        .setFooter({ text: 'Harap patuhi aturan server untuk menghindari sanksi lebih lanjut' })
        .setTimestamp();
    
    if (totalWarnings >= maxWarnings) {
        embed.addFields({ name: '🔨 Tindakan', value: 'Anda akan di-mute karena mencapai batas maksimal warning', inline: false });
    }
    
    try {
        await message.channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error mengirim warning:', error);
    }
}

/**
 * Log pelanggaran ke channel log
 * @param {Message} message - Pesan Discord
 * @param {Array} violations - Daftar pelanggaran
 * @param {Number} totalWarnings - Total warning
 */
async function logViolation(message, violations, totalWarnings) {
    try {
        const config = modConfig.get(message.guild.id);
        const logChannel = await message.client.channels.fetch(config.logChannel);
        
        const violationList = violations.map(v => `• **${v.type}**: ${v.reason}`).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🤖 Auto Moderation Log')
            .addFields(
                { name: '👤 User', value: `${message.author} (${message.author.id})`, inline: true },
                { name: '📍 Channel', value: `${message.channel}`, inline: true },
                { name: '📊 Total Warnings', value: `${totalWarnings}`, inline: true },
                { name: '🚫 Pelanggaran', value: violationList, inline: false },
                { name: '💬 Pesan Asli', value: message.content.substring(0, 1000) || 'Tidak ada konten', inline: false }
            )
            .setTimestamp();
        
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging violation:', error);
    }
}

/**
 * Ambil tindakan terhadap user yang melanggar
 * @param {Message} message - Pesan Discord
 * @param {Number} totalWarnings - Total warning
 * @param {Object} config - Konfigurasi auto mod
 */
async function takeAction(message, totalWarnings, config) {
    try {
        // Mute user
        const muteRole = message.guild.roles.cache.find(role => role.name === 'Muted');
        
        if (muteRole) {
            await message.member.roles.add(muteRole);
            
            // Hapus mute setelah durasi tertentu
            setTimeout(async () => {
                try {
                    await message.member.roles.remove(muteRole);
                    
                    const unmuteEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🔊 Auto Unmute')
                        .setDescription(`${message.author} telah di-unmute otomatis.`)
                        .setTimestamp();
                    
                    await message.channel.send({ embeds: [unmuteEmbed] });
                } catch (error) {
                    console.error('Error unmuting user:', error);
                }
            }, config.muteDuration * 60 * 1000);
            
            const muteEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔇 Auto Mute')
                .setDescription(`${message.author} telah di-mute selama ${config.muteDuration} menit karena mencapai ${totalWarnings} warnings.`)
                .setTimestamp();
            
            await message.channel.send({ embeds: [muteEmbed] });
        }
    } catch (error) {
        console.error('Error taking action:', error);
    }
}

/**
 * Setup sistem auto moderation di channel
 * @param {Client} client - Discord client
 * @param {String} channelId - ID channel
 */
async function setupAutoModSystem(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            console.error(`Channel dengan ID ${channelId} tidak ditemukan!`);
            return;
        }
        
        const autoModEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('🤖 Nexus Auto Moderation')
            .setDescription('Sistem moderasi otomatis yang melindungi server dari spam, kata kasar, dan pelanggaran lainnya')
            .addFields(
                { name: '🛡️ Fitur Perlindungan', value: '• Spam Protection\n• Profanity Filter\n• Link Protection\n• Caps Filter\n• Duplicate Message Filter', inline: false },
                { name: '⚡ Tindakan Otomatis', value: '• Auto delete pesan melanggar\n• Warning system\n• Auto mute untuk pelanggar\n• Logging aktivitas', inline: false },
                { name: '⚙️ Konfigurasi', value: '• Exempt roles & channels\n• Adjustable warning limits\n• Custom mute duration\n• Toggle features on/off', inline: false }
            )
            .setImage('https://i.imgur.com/automod-banner.png')
            .setFooter({ text: 'Nexus Auto Moderation • Menjaga server tetap aman dan nyaman!' })
            .setTimestamp();
        
        const autoModButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('automod_config')
                    .setLabel('Konfigurasi')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('automod_stats')
                    .setLabel('Statistik')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('automod_warnings')
                    .setLabel('Lihat Warnings')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚠️')
            );
        
        await channel.send({
            embeds: [autoModEmbed],
            components: [autoModButtons]
        });
        
        console.log(`Sistem auto moderation berhasil diatur di channel ${channel.name}`);
    } catch (error) {
        console.error('Error saat mengatur sistem auto moderation:', error);
    }
}

/**
 * Menampilkan statistik auto moderation
 * @param {Interaction} interaction - Discord interaction
 */
async function showAutoModStats(interaction) {
    try {
        const guildId = interaction.guild.id;
        const guildViolations = Array.from(violations.values()).filter(v => v.guildId === guildId);
        
        if (guildViolations.length === 0) {
            await interaction.reply({
                content: '📊 Belum ada data pelanggaran untuk server ini.',
                ephemeral: true
            });
            return;
        }
        
        // Hitung statistik
        const totalViolations = guildViolations.reduce((sum, v) => sum + v.violations.length, 0);
        const totalWarnings = guildViolations.reduce((sum, v) => sum + v.warnings, 0);
        
        // Hitung per jenis pelanggaran
        const violationTypes = {};
        guildViolations.forEach(userViolation => {
            userViolation.violations.forEach(violation => {
                if (!violationTypes[violation.type]) {
                    violationTypes[violation.type] = 0;
                }
                violationTypes[violation.type]++;
            });
        });
        
        const typeBreakdown = Object.entries(violationTypes)
            .map(([type, count]) => `**${type}**: ${count}`)
            .join('\n') || 'Tidak ada data';
        
        // Top violators
        const topViolators = guildViolations
            .sort((a, b) => b.warnings - a.warnings)
            .slice(0, 5)
            .map((v, index) => `${index + 1}. <@${v.userId}> - ${v.warnings} warnings`)
            .join('\n') || 'Tidak ada data';
        
        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('📊 Auto Moderation Statistics')
            .addFields(
                { name: '📈 Summary', value: `Total Users: ${guildViolations.length}\nTotal Violations: ${totalViolations}\nTotal Warnings: ${totalWarnings}`, inline: true },
                { name: '🚫 Violation Types', value: typeBreakdown, inline: true },
                { name: '👥 Top Violators', value: topViolators, inline: false }
            )
            .setFooter({ text: 'Data diperbarui secara real-time' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error menampilkan stats auto mod:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan statistik.',
            ephemeral: true
        });
    }
}

module.exports = {
    setupAutoMod,
    setupAutoModSystem,
    processMessage,
    showAutoModStats,
    addViolation,
    violations,
    modConfig,
    DEFAULT_CONFIG
};