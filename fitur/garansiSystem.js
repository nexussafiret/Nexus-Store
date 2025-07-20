const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

/**
 * Fungsi untuk membuat pesan garansi dengan tombol claim
 * @param {Client} client - Client Discord
 * @param {String} channelId - ID channel untuk mengirim pesan garansi
 */
async function setupGaransiSystem(client, channelId) {
    try {
        // Mendapatkan channel berdasarkan ID
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            console.error(`Channel dengan ID ${channelId} tidak ditemukan!`);
            return;
        }
        
        // Membuat embed untuk pesan garansi
        const garansiEmbed = new EmbedBuilder()
            .setColor('#00FFFF')
            .setTitle('🛡️ Sistem Claim Garansi')
            .setDescription('Kami memberikan garansi untuk setiap produk yang Anda beli. Jika Anda mengalami masalah dengan produk kami, silakan klaim garansi dengan mengklik tombol di bawah ini.')
            .addFields(
                { name: '⏱️ Periode Garansi', value: 'Garansi berlaku selama 30 hari sejak tanggal pembelian', inline: false },
                { name: '📋 Syarat & Ketentuan', value: '• Produk masih dalam masa garansi\n• Kerusakan bukan karena kesalahan pengguna\n• Memiliki bukti pembelian (ID Order)', inline: false },
                { name: '🔄 Proses Klaim', value: '1. Klik tombol "Claim Garansi" di bawah\n2. Isi formulir dengan ID Order dan deskripsi masalah\n3. Tim kami akan menghubungi Anda dalam 1x24 jam', inline: false }
            )
            .setImage('https://i.imgur.com/wSTFkRM.png') // Ganti dengan URL gambar garansi Anda
            .setFooter({ text: 'Sistem Garansi • Hubungi admin jika ada pertanyaan' })
            .setTimestamp();
        
        // Membuat tombol claim garansi
        const garansiButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_garansi')
                    .setLabel('Claim Garansi')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛡️')
            );
        
        // Mengirim pesan dengan tombol garansi
        await channel.send({
            embeds: [garansiEmbed],
            components: [garansiButton]
        });
        
        console.log(`Sistem garansi berhasil diatur di channel ${channel.name}`);
    } catch (error) {
        console.error('Error saat mengatur sistem garansi:', error);
    }
}

/**
 * Fungsi untuk menampilkan form claim garansi
 * @param {Interaction} interaction - Interaksi Discord
 */
async function showGaransiForm(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('garansi_modal')
            .setTitle('Claim Garansi Produk');
        
        const orderIdInput = new TextInputBuilder()
            .setCustomId('order_id')
            .setLabel('ID Order')
            .setPlaceholder('Masukkan ID Order pembelian Anda (contoh: ORD-123456)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const productNameInput = new TextInputBuilder()
            .setCustomId('product_name')
            .setLabel('Nama Produk')
            .setPlaceholder('Masukkan nama produk yang ingin diklaim garansinya')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const descriptionInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Deskripsi Masalah')
            .setPlaceholder('Jelaskan secara detail masalah yang Anda alami dengan produk...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
        
        const purchaseDateInput = new TextInputBuilder()
            .setCustomId('purchase_date')
            .setLabel('Tanggal Pembelian (Opsional)')
            .setPlaceholder('Format: DD/MM/YYYY (contoh: 01/01/2023)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const contactInfoInput = new TextInputBuilder()
            .setCustomId('contact_info')
            .setLabel('Informasi Kontak (Opsional)')
            .setPlaceholder('Masukkan kontak tambahan (email/no. telepon) jika ada')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const firstActionRow = new ActionRowBuilder().addComponents(orderIdInput);
        const secondActionRow = new ActionRowBuilder().addComponents(productNameInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(descriptionInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(purchaseDateInput);
        const fifthActionRow = new ActionRowBuilder().addComponents(contactInfoInput);
        
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error saat menampilkan form garansi:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan form garansi. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses form claim garansi
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} logsChannelId - ID channel untuk logs garansi
 */
async function processGaransiForm(interaction, logsChannelId) {
    try {
        // Mendapatkan nilai dari form
        const orderId = interaction.fields.getTextInputValue('order_id');
        const productName = interaction.fields.getTextInputValue('product_name');
        const description = interaction.fields.getTextInputValue('description');
        const purchaseDate = interaction.fields.getTextInputValue('purchase_date') || 'Tidak disebutkan';
        const contactInfo = interaction.fields.getTextInputValue('contact_info') || 'Tidak disebutkan';
        
        // Generate ID klaim garansi
        const claimId = `CLAIM-${Date.now().toString().slice(-6)}`;
        
        // Membuat embed untuk klaim garansi
        const garansiEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`🛡️ Klaim Garansi Baru: ${claimId}`)
            .addFields(
                { name: '👤 Pengguna', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: '🆔 ID Order', value: orderId, inline: true },
                { name: '📅 Tanggal Klaim', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📦 Nama Produk', value: productName, inline: true },
                { name: '📆 Tanggal Pembelian', value: purchaseDate, inline: true },
                { name: '📞 Informasi Kontak', value: contactInfo, inline: true },
                { name: '📝 Deskripsi Masalah', value: description, inline: false }
            )
            .setFooter({ text: `Claim ID: ${claimId} • Submitted by ${interaction.user.id}` })
            .setTimestamp();
        
        // Tombol untuk menangani klaim
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_claim_${claimId}_${interaction.user.id}`)
                    .setLabel('Setujui Klaim')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`reject_claim_${claimId}_${interaction.user.id}`)
                    .setLabel('Tolak Klaim')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId(`contact_user_${claimId}_${interaction.user.id}`)
                    .setLabel('Hubungi Pengguna')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📞')
            );
        
        // Mengirim klaim ke channel logs
        const logsChannel = await interaction.client.channels.fetch(logsChannelId).catch(() => null);
        if (logsChannel) {
            await logsChannel.send({
                embeds: [garansiEmbed],
                components: [actionButtons]
            });
        } else {
            console.error(`Channel logs dengan ID ${logsChannelId} tidak ditemukan!`);
        }
        
        // Konfirmasi kepada pengguna
        await interaction.reply({
            content: `✅ Klaim garansi Anda telah berhasil dikirim! ID Klaim: **${claimId}**\n\nTim kami akan meninjau klaim Anda dan menghubungi Anda dalam 1x24 jam. Terima kasih atas kesabaran Anda.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat memproses form garansi:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses klaim garansi. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses persetujuan klaim garansi
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} claimId - ID klaim garansi
 * @param {String} userId - ID user yang mengajukan klaim
 */
async function approveGaransiClaim(interaction, claimId, userId) {
    try {
        // Mengirim DM ke pengguna
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (user) {
            const approvalEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle(`✅ Klaim Garansi Disetujui: ${claimId}`)
                .setDescription('Selamat! Klaim garansi Anda telah disetujui. Tim kami akan segera menghubungi Anda untuk proses penggantian atau perbaikan produk.')
                .addFields(
                    { name: '📅 Tanggal Persetujuan', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '👤 Disetujui Oleh', value: interaction.user.tag, inline: true },
                    { name: '📋 Langkah Selanjutnya', value: 'Tim kami akan menghubungi Anda dalam 1x24 jam untuk proses lebih lanjut. Harap pastikan Anda dapat dihubungi melalui Discord atau kontak yang Anda berikan.', inline: false }
                )
                .setFooter({ text: `Claim ID: ${claimId}` })
                .setTimestamp();
            
            await user.send({ embeds: [approvalEmbed] }).catch(() => {
                console.error(`Tidak dapat mengirim DM ke user ${userId}`);
            });
        }
        
        // Update pesan di channel logs
        await interaction.message.edit({
            embeds: [
                EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('#00FF00')
                    .setTitle(`✅ Klaim Garansi Disetujui: ${claimId}`)
            ],
            components: []
        });
        
        // Konfirmasi kepada admin
        await interaction.reply({
            content: `✅ Klaim garansi **${claimId}** telah disetujui dan pengguna telah diberitahu.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat menyetujui klaim garansi:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menyetujui klaim garansi. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses penolakan klaim garansi
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} claimId - ID klaim garansi
 * @param {String} userId - ID user yang mengajukan klaim
 */
async function rejectGaransiClaim(interaction, claimId, userId) {
    try {
        // Tampilkan modal untuk alasan penolakan
        const modal = new ModalBuilder()
            .setCustomId(`reject_reason_${claimId}_${userId}`)
            .setTitle('Alasan Penolakan Klaim');
        
        const reasonInput = new TextInputBuilder()
            .setCustomId('reject_reason')
            .setLabel('Alasan Penolakan')
            .setPlaceholder('Masukkan alasan penolakan klaim garansi ini...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
        
        const actionRow = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(actionRow);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error saat menampilkan form alasan penolakan:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan form alasan penolakan. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses alasan penolakan klaim garansi
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} claimId - ID klaim garansi
 * @param {String} userId - ID user yang mengajukan klaim
 */
async function processRejectReason(interaction, claimId, userId) {
    try {
        // Mendapatkan alasan penolakan
        const rejectReason = interaction.fields.getTextInputValue('reject_reason');
        
        // Mengirim DM ke pengguna
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (user) {
            const rejectionEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`❌ Klaim Garansi Ditolak: ${claimId}`)
                .setDescription('Mohon maaf, klaim garansi Anda tidak dapat disetujui.')
                .addFields(
                    { name: '📅 Tanggal Penolakan', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '👤 Ditolak Oleh', value: interaction.user.tag, inline: true },
                    { name: '📝 Alasan Penolakan', value: rejectReason, inline: false },
                    { name: '❓ Pertanyaan Lebih Lanjut', value: 'Jika Anda memiliki pertanyaan atau keberatan, silakan hubungi tim dukungan kami melalui Discord atau email.', inline: false }
                )
                .setFooter({ text: `Claim ID: ${claimId}` })
                .setTimestamp();
            
            await user.send({ embeds: [rejectionEmbed] }).catch(() => {
                console.error(`Tidak dapat mengirim DM ke user ${userId}`);
            });
        }
        
        // Update pesan di channel logs
        await interaction.message.edit({
            embeds: [
                EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('#FF0000')
                    .setTitle(`❌ Klaim Garansi Ditolak: ${claimId}`)
                    .addFields({ name: '📝 Alasan Penolakan', value: rejectReason, inline: false })
            ],
            components: []
        });
        
        // Konfirmasi kepada admin
        await interaction.reply({
            content: `✅ Klaim garansi **${claimId}** telah ditolak dan pengguna telah diberitahu.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat memproses alasan penolakan:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses alasan penolakan. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk menampilkan form kontak pengguna
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} claimId - ID klaim garansi
 * @param {String} userId - ID user yang mengajukan klaim
 */
async function showContactUserForm(interaction, claimId, userId) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`contact_message_${claimId}_${userId}`)
            .setTitle('Hubungi Pengguna');
        
        const messageInput = new TextInputBuilder()
            .setCustomId('contact_message')
            .setLabel('Pesan')
            .setPlaceholder('Masukkan pesan yang ingin disampaikan kepada pengguna...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
        
        const actionRow = new ActionRowBuilder().addComponents(messageInput);
        modal.addComponents(actionRow);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error saat menampilkan form kontak pengguna:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan form kontak pengguna. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses pesan kontak pengguna
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} claimId - ID klaim garansi
 * @param {String} userId - ID user yang mengajukan klaim
 */
async function processContactMessage(interaction, claimId, userId) {
    try {
        // Mendapatkan pesan kontak
        const contactMessage = interaction.fields.getTextInputValue('contact_message');
        
        // Mengirim DM ke pengguna
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (user) {
            const contactEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`📞 Pesan Terkait Klaim Garansi: ${claimId}`)
                .setDescription('Tim kami telah mengirimkan pesan terkait klaim garansi Anda:')
                .addFields(
                    { name: '📅 Tanggal Pesan', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '👤 Dikirim Oleh', value: interaction.user.tag, inline: true },
                    { name: '📝 Pesan', value: contactMessage, inline: false },
                    { name: '📢 Balasan', value: 'Anda dapat membalas pesan ini dengan menghubungi tim dukungan kami melalui Discord atau email.', inline: false }
                )
                .setFooter({ text: `Claim ID: ${claimId}` })
                .setTimestamp();
            
            await user.send({ embeds: [contactEmbed] }).catch(() => {
                console.error(`Tidak dapat mengirim DM ke user ${userId}`);
            });
        }
        
        // Konfirmasi kepada admin
        await interaction.reply({
            content: `✅ Pesan telah berhasil dikirim ke pengguna untuk klaim garansi **${claimId}**.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat memproses pesan kontak:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses pesan kontak. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

// Export fungsi-fungsi
module.exports = {
    setupGaransiSystem,
    showGaransiForm,
    processGaransiForm,
    approveGaransiClaim,
    rejectGaransiClaim,
    processRejectReason,
    showContactUserForm,
    processContactMessage
}; 