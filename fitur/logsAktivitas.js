const { EmbedBuilder, AuditLogEvent } = require('discord.js');

/**
 * Modul untuk mencatat aktivitas member di server
 * @module logsAktivitas
 */

/**
 * Mengirim log aktivitas ke channel logs
 * @param {Object} client - Client Discord
 * @param {String} channelId - ID channel untuk logs aktivitas
 * @param {Object} embed - Embed yang akan dikirim
 */
async function sendLog(client, channelId, embed) {
    try {
        const logsChannel = await client.channels.fetch(channelId).catch(err => {
            console.error(`Error saat mengambil channel logs: ${err.message}`);
            return null;
        });

        if (logsChannel) {
            await logsChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error(`Error saat mengirim log: ${error.message}`);
    }
}

/**
 * Membuat embed untuk log aktivitas
 * @param {String} title - Judul log
 * @param {String} description - Deskripsi log
 * @param {String} color - Warna embed
 * @param {Object} user - User yang melakukan aktivitas
 * @param {Array} fields - Fields tambahan untuk embed
 * @returns {Object} - Embed yang sudah dibuat
 */
function createLogEmbed(title, description, color, user, fields = []) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    if (user) {
        embed.setAuthor({
            name: user.tag,
            iconURL: user.displayAvatarURL({ dynamic: true })
        });
        embed.setFooter({
            text: `User ID: ${user.id}`
        });
    }

    if (fields.length > 0) {
        embed.addFields(fields);
    }

    return embed;
}

/**
 * Setup event listeners untuk logs aktivitas
 * @param {Object} client - Client Discord
 * @param {String} channelId - ID channel untuk logs aktivitas
 */
function setupActivityLogs(client, channelId) {
    // Log saat member bergabung ke server
    client.on('guildMemberAdd', async (member) => {
        const embed = createLogEmbed(
            '👋 Member Bergabung',
            `${member.user.tag} telah bergabung ke server.`,
            '#00FF00',
            member.user,
            [
                { name: 'Akun Dibuat', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Member Ke-', value: `${member.guild.memberCount}`, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat member keluar dari server
    client.on('guildMemberRemove', async (member) => {
        // Cek apakah member di-kick atau ban
        let reason = 'Keluar sendiri';
        let color = '#FF0000';

        try {
            const auditLogs = await member.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 1
            });
            const kickLog = auditLogs.entries.first();

            if (kickLog && kickLog.target.id === member.user.id && kickLog.createdTimestamp > (Date.now() - 5000)) {
                reason = `Di-kick oleh ${kickLog.executor.tag}\nAlasan: ${kickLog.reason || 'Tidak ada alasan'}`;
                color = '#FFA500';
            } else {
                const banLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberBanAdd,
                    limit: 1
                });
                const banLog = banLogs.entries.first();

                if (banLog && banLog.target.id === member.user.id && banLog.createdTimestamp > (Date.now() - 5000)) {
                    reason = `Di-ban oleh ${banLog.executor.tag}\nAlasan: ${banLog.reason || 'Tidak ada alasan'}`;
                    color = '#800000';
                }
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '👋 Member Keluar',
            `${member.user.tag} telah keluar dari server.`,
            color,
            member.user,
            [
                { name: 'Bergabung Sejak', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Alasan', value: reason, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat pesan dihapus
    client.on('messageDelete', async (message) => {
        // Jangan log pesan dari bot
        if (message.author.bot) return;

        let content = message.content;
        if (!content || content.length === 0) content = 'Tidak ada konten teks (mungkin hanya embed atau attachment)';
        if (content.length > 1024) content = content.substring(0, 1021) + '...';

        const attachments = Array.from(message.attachments.values());
        let attachmentList = 'Tidak ada attachment';
        if (attachments.length > 0) {
            attachmentList = attachments.map(a => `[${a.name}](${a.url})`).join(', ');
        }

        // Cek siapa yang menghapus pesan
        let deletedBy = 'Tidak diketahui (mungkin oleh pengirim)';
        try {
            const auditLogs = await message.guild.fetchAuditLogs({
                type: AuditLogEvent.MessageDelete,
                limit: 1
            });
            const deleteLog = auditLogs.entries.first();

            if (deleteLog && deleteLog.target.id === message.author.id && deleteLog.createdTimestamp > (Date.now() - 5000)) {
                deletedBy = deleteLog.executor.tag;
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '🗑️ Pesan Dihapus',
            `Pesan dari ${message.author.tag} dihapus di ${message.channel}.`,
            '#FF0000',
            message.author,
            [
                { name: 'Konten', value: content, inline: false },
                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Dihapus Oleh', value: deletedBy, inline: true },
                { name: 'Attachment', value: attachmentList, inline: false }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat pesan diedit
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        // Jangan log pesan dari bot atau jika konten sama
        if (oldMessage.author.bot || oldMessage.content === newMessage.content) return;

        let oldContent = oldMessage.content;
        let newContent = newMessage.content;

        if (!oldContent || oldContent.length === 0) oldContent = 'Tidak ada konten teks';
        if (!newContent || newContent.length === 0) newContent = 'Tidak ada konten teks';

        if (oldContent.length > 1024) oldContent = oldContent.substring(0, 1021) + '...';
        if (newContent.length > 1024) newContent = newContent.substring(0, 1021) + '...';

        const embed = createLogEmbed(
            '✏️ Pesan Diedit',
            `Pesan dari ${oldMessage.author.tag} diedit di ${oldMessage.channel}.`,
            '#FFA500',
            oldMessage.author,
            [
                { name: 'Sebelum', value: oldContent, inline: false },
                { name: 'Sesudah', value: newContent, inline: false },
                { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
                { name: 'Link Pesan', value: `[Klik di sini](${newMessage.url})`, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat member diupdate (nickname, role, dll)
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        const changes = [];

        // Cek perubahan nickname
        if (oldMember.nickname !== newMember.nickname) {
            const oldNick = oldMember.nickname || 'Tidak ada nickname';
            const newNick = newMember.nickname || 'Tidak ada nickname';
            changes.push({ name: 'Nickname', value: `${oldNick} → ${newNick}`, inline: false });
        }

        // Cek perubahan role
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

        if (addedRoles.size > 0) {
            changes.push({ name: 'Role Ditambahkan', value: addedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false });
        }

        if (removedRoles.size > 0) {
            changes.push({ name: 'Role Dihapus', value: removedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false });
        }

        // Jika ada perubahan, kirim log
        if (changes.length > 0) {
            // Cek siapa yang melakukan perubahan
            let updatedBy = 'Tidak diketahui';
            try {
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 1
                });
                const updateLog = auditLogs.entries.first();

                if (updateLog && updateLog.target.id === newMember.user.id && updateLog.createdTimestamp > (Date.now() - 5000)) {
                    updatedBy = updateLog.executor.tag;
                }
            } catch (error) {
                console.error(`Error saat memeriksa audit logs: ${error.message}`);
            }

            changes.push({ name: 'Diubah Oleh', value: updatedBy, inline: true });

            const embed = createLogEmbed(
                '👤 Member Diperbarui',
                `${newMember.user.tag} telah diperbarui.`,
                '#00FFFF',
                newMember.user,
                changes
            );

            await sendLog(client, channelId, embed);
        }
    });

    // Log saat member di-ban
    client.on('guildBanAdd', async (ban) => {
        let banner = 'Tidak diketahui';
        let reason = ban.reason || 'Tidak ada alasan';

        try {
            const auditLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1
            });
            const banLog = auditLogs.entries.first();

            if (banLog && banLog.target.id === ban.user.id && banLog.createdTimestamp > (Date.now() - 5000)) {
                banner = banLog.executor.tag;
                reason = banLog.reason || 'Tidak ada alasan';
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '🔨 Member Di-ban',
            `${ban.user.tag} telah di-ban dari server.`,
            '#800000',
            ban.user,
            [
                { name: 'Alasan', value: reason, inline: false },
                { name: 'Di-ban Oleh', value: banner, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat member di-unban
    client.on('guildBanRemove', async (ban) => {
        let unbanner = 'Tidak diketahui';

        try {
            const auditLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanRemove,
                limit: 1
            });
            const unbanLog = auditLogs.entries.first();

            if (unbanLog && unbanLog.target.id === ban.user.id && unbanLog.createdTimestamp > (Date.now() - 5000)) {
                unbanner = unbanLog.executor.tag;
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '🔓 Member Di-unban',
            `${ban.user.tag} telah di-unban dari server.`,
            '#00FF00',
            ban.user,
            [
                { name: 'Di-unban Oleh', value: unbanner, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat channel dibuat
    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return; // Hanya log channel di guild

        let creator = 'Tidak diketahui';

        try {
            const auditLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelCreate,
                limit: 1
            });
            const createLog = auditLogs.entries.first();

            if (createLog && createLog.target.id === channel.id && createLog.createdTimestamp > (Date.now() - 5000)) {
                creator = createLog.executor.tag;
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '📝 Channel Dibuat',
            `Channel baru telah dibuat: ${channel.name}`,
            '#00FF00',
            null,
            [
                { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                { name: 'Tipe', value: channel.type, inline: true },
                { name: 'Dibuat Oleh', value: creator, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat channel dihapus
    client.on('channelDelete', async (channel) => {
        if (!channel.guild) return; // Hanya log channel di guild

        let deleter = 'Tidak diketahui';

        try {
            const auditLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelDelete,
                limit: 1
            });
            const deleteLog = auditLogs.entries.first();

            if (deleteLog && deleteLog.target.id === channel.id && deleteLog.createdTimestamp > (Date.now() - 5000)) {
                deleter = deleteLog.executor.tag;
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '🗑️ Channel Dihapus',
            `Channel telah dihapus: ${channel.name}`,
            '#FF0000',
            null,
            [
                { name: 'Channel ID', value: channel.id, inline: true },
                { name: 'Tipe', value: channel.type, inline: true },
                { name: 'Dihapus Oleh', value: deleter, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat role dibuat
    client.on('roleCreate', async (role) => {
        let creator = 'Tidak diketahui';

        try {
            const auditLogs = await role.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleCreate,
                limit: 1
            });
            const createLog = auditLogs.entries.first();

            if (createLog && createLog.target.id === role.id && createLog.createdTimestamp > (Date.now() - 5000)) {
                creator = createLog.executor.tag;
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '🏷️ Role Dibuat',
            `Role baru telah dibuat: ${role.name}`,
            '#00FF00',
            null,
            [
                { name: 'Role', value: `<@&${role.id}>`, inline: true },
                { name: 'Warna', value: role.hexColor, inline: true },
                { name: 'Dibuat Oleh', value: creator, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat role dihapus
    client.on('roleDelete', async (role) => {
        let deleter = 'Tidak diketahui';

        try {
            const auditLogs = await role.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleDelete,
                limit: 1
            });
            const deleteLog = auditLogs.entries.first();

            if (deleteLog && deleteLog.target.id === role.id && deleteLog.createdTimestamp > (Date.now() - 5000)) {
                deleter = deleteLog.executor.tag;
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '🗑️ Role Dihapus',
            `Role telah dihapus: ${role.name}`,
            '#FF0000',
            null,
            [
                { name: 'Role ID', value: role.id, inline: true },
                { name: 'Warna', value: role.hexColor, inline: true },
                { name: 'Dihapus Oleh', value: deleter, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat voice state berubah (join/leave voice channel)
    client.on('voiceStateUpdate', async (oldState, newState) => {
        // Jika user join voice channel
        if (!oldState.channelId && newState.channelId) {
            const embed = createLogEmbed(
                '🔊 Voice Join',
                `${newState.member.user.tag} bergabung ke voice channel.`,
                '#00FF00',
                newState.member.user,
                [
                    { name: 'Channel', value: `<#${newState.channelId}>`, inline: true }
                ]
            );

            await sendLog(client, channelId, embed);
        }
        // Jika user leave voice channel
        else if (oldState.channelId && !newState.channelId) {
            const embed = createLogEmbed(
                '🔊 Voice Leave',
                `${oldState.member.user.tag} keluar dari voice channel.`,
                '#FF0000',
                oldState.member.user,
                [
                    { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true }
                ]
            );

            await sendLog(client, channelId, embed);
        }
        // Jika user pindah voice channel
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            const embed = createLogEmbed(
                '🔊 Voice Move',
                `${newState.member.user.tag} berpindah voice channel.`,
                '#FFA500',
                newState.member.user,
                [
                    { name: 'Dari', value: `<#${oldState.channelId}>`, inline: true },
                    { name: 'Ke', value: `<#${newState.channelId}>`, inline: true }
                ]
            );

            await sendLog(client, channelId, embed);
        }
        // Jika user mute/unmute/deafen/undeafen
        else if (oldState.channelId && newState.channelId && oldState.channelId === newState.channelId) {
            const changes = [];

            // Cek perubahan mute
            if (oldState.mute !== newState.mute) {
                changes.push({ name: 'Mute', value: newState.mute ? 'Muted' : 'Unmuted', inline: true });
            }

            // Cek perubahan deafen
            if (oldState.deaf !== newState.deaf) {
                changes.push({ name: 'Deafen', value: newState.deaf ? 'Deafened' : 'Undeafened', inline: true });
            }

            // Cek perubahan self mute
            if (oldState.selfMute !== newState.selfMute) {
                changes.push({ name: 'Self Mute', value: newState.selfMute ? 'Muted' : 'Unmuted', inline: true });
            }

            // Cek perubahan self deafen
            if (oldState.selfDeaf !== newState.selfDeaf) {
                changes.push({ name: 'Self Deafen', value: newState.selfDeaf ? 'Deafened' : 'Undeafened', inline: true });
            }

            // Cek perubahan streaming
            if (oldState.streaming !== newState.streaming) {
                changes.push({ name: 'Streaming', value: newState.streaming ? 'Started' : 'Stopped', inline: true });
            }

            // Cek perubahan video
            if (oldState.selfVideo !== newState.selfVideo) {
                changes.push({ name: 'Video', value: newState.selfVideo ? 'Started' : 'Stopped', inline: true });
            }

            if (changes.length > 0) {
                changes.push({ name: 'Channel', value: `<#${newState.channelId}>`, inline: false });

                const embed = createLogEmbed(
                    '🔊 Voice Update',
                    `${newState.member.user.tag} mengubah status voice.`,
                    '#00FFFF',
                    newState.member.user,
                    changes
                );

                await sendLog(client, channelId, embed);
            }
        }
    });

    // Log saat member update username/avatar
    client.on('userUpdate', async (oldUser, newUser) => {
        const changes = [];

        // Cek perubahan username
        if (oldUser.username !== newUser.username) {
            changes.push({ name: 'Username', value: `${oldUser.username} → ${newUser.username}`, inline: false });
        }

        // Cek perubahan discriminator
        if (oldUser.discriminator !== newUser.discriminator) {
            changes.push({ name: 'Discriminator', value: `${oldUser.discriminator} → ${newUser.discriminator}`, inline: false });
        }

        // Cek perubahan avatar
        if (oldUser.avatar !== newUser.avatar) {
            changes.push({ 
                name: 'Avatar', 
                value: `[Sebelum](${oldUser.displayAvatarURL({ dynamic: true })}) → [Sesudah](${newUser.displayAvatarURL({ dynamic: true })})`, 
                inline: false 
            });
        }

        // Jika ada perubahan, kirim log
        if (changes.length > 0) {
            const embed = createLogEmbed(
                '👤 User Update',
                `${newUser.tag} telah memperbarui profilnya.`,
                '#FFA500',
                newUser,
                changes
            );

            await sendLog(client, channelId, embed);
        }
    });

    // Log saat emoji ditambahkan
    client.on('emojiCreate', async (emoji) => {
        let creator = 'Tidak diketahui';

        try {
            const auditLogs = await emoji.guild.fetchAuditLogs({
                type: AuditLogEvent.EmojiCreate,
                limit: 1
            });
            const createLog = auditLogs.entries.first();

            if (createLog && createLog.target.id === emoji.id && createLog.createdTimestamp > (Date.now() - 5000)) {
                creator = createLog.executor.tag;
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '😀 Emoji Ditambahkan',
            `Emoji baru telah ditambahkan: ${emoji.name}`,
            '#00FF00',
            null,
            [
                { name: 'Emoji', value: `<:${emoji.name}:${emoji.id}>`, inline: true },
                { name: 'Ditambahkan Oleh', value: creator, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat emoji dihapus
    client.on('emojiDelete', async (emoji) => {
        let deleter = 'Tidak diketahui';

        try {
            const auditLogs = await emoji.guild.fetchAuditLogs({
                type: AuditLogEvent.EmojiDelete,
                limit: 1
            });
            const deleteLog = auditLogs.entries.first();

            if (deleteLog && deleteLog.target.id === emoji.id && deleteLog.createdTimestamp > (Date.now() - 5000)) {
                deleter = deleteLog.executor.tag;
            }
        } catch (error) {
            console.error(`Error saat memeriksa audit logs: ${error.message}`);
        }

        const embed = createLogEmbed(
            '😀 Emoji Dihapus',
            `Emoji telah dihapus: ${emoji.name}`,
            '#FF0000',
            null,
            [
                { name: 'Emoji ID', value: emoji.id, inline: true },
                { name: 'Dihapus Oleh', value: deleter, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    // Log saat invite dibuat
    client.on('inviteCreate', async (invite) => {
        const embed = createLogEmbed(
            '📨 Invite Dibuat',
            `Invite baru telah dibuat: ${invite.code}`,
            '#00FF00',
            invite.inviter,
            [
                { name: 'Code', value: invite.code, inline: true },
                { name: 'Channel', value: `<#${invite.channel.id}>`, inline: true },
                { name: 'Max Uses', value: invite.maxUses === 0 ? 'Unlimited' : invite.maxUses.toString(), inline: true },
                { name: 'Expires', value: invite.maxAge === 0 ? 'Never' : `${invite.maxAge / 60} minutes`, inline: true }
            ]
        );

        await sendLog(client, channelId, embed);
    });

    console.log('Logs aktivitas berhasil diatur!');
}

module.exports = {
    setupActivityLogs
}; 