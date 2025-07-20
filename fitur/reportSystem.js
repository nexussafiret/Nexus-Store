const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

/**
 * Fungsi untuk membuat tombol report
 * @returns {ActionRowBuilder} Row dengan tombol report
 */
function createReportButton() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('report_button')
                .setLabel('Report')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚨')
        );
    
    return row;
}

/**
 * Fungsi untuk menampilkan pilihan jenis report
 * @param {Interaction} interaction - Interaksi Discord
 */
async function showReportOptions(interaction) {
    try {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('report_member')
                    .setLabel('Laporkan Member')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('report_bug')
                    .setLabel('Laporkan Bug/Request')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🐛')
            );
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Sistem Pelaporan')
            .setDescription('Silakan pilih jenis laporan yang ingin Anda buat:')
            .addFields(
                { name: '👤 Laporkan Member', value: 'Gunakan ini untuk melaporkan perilaku member yang melanggar aturan', inline: false },
                { name: '🐛 Laporkan Bug/Request', value: 'Gunakan ini untuk melaporkan bug atau meminta fitur/produk baru', inline: false }
            )
            .setFooter({ text: 'Sistem Pelaporan' })
            .setTimestamp();
        
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat menampilkan opsi report:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan opsi report. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk menampilkan form laporan member
 * @param {Interaction} interaction - Interaksi Discord
 */
async function showMemberReportForm(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('member_report_modal')
            .setTitle('Laporkan Member');
        
        const nameInput = new TextInputBuilder()
            .setCustomId('reporter_name')
            .setLabel('Nama Anda')
            .setPlaceholder('Masukkan nama Anda')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const reportedUserInput = new TextInputBuilder()
            .setCustomId('reported_user')
            .setLabel('Nama Discord Member yang Dilaporkan')
            .setPlaceholder('Contoh: Username#0000 atau @Username')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const chronologyInput = new TextInputBuilder()
            .setCustomId('chronology')
            .setLabel('Kronologi Kejadian')
            .setPlaceholder('Jelaskan secara detail apa yang terjadi...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
        
        const evidenceInput = new TextInputBuilder()
            .setCustomId('evidence')
            .setLabel('Bukti (Opsional)')
            .setPlaceholder('Link screenshot/bukti lainnya (jika ada)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const additionalInfoInput = new TextInputBuilder()
            .setCustomId('additional_info')
            .setLabel('Informasi Tambahan (Opsional)')
            .setPlaceholder('Informasi tambahan yang mungkin berguna')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);
        
        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(reportedUserInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(chronologyInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(evidenceInput);
        const fifthActionRow = new ActionRowBuilder().addComponents(additionalInfoInput);
        
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error saat menampilkan form laporan member:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan form laporan. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk menampilkan form laporan bug/request
 * @param {Interaction} interaction - Interaksi Discord
 */
async function showBugReportForm(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('bug_report_modal')
            .setTitle('Laporkan Bug/Request');
        
        const nameInput = new TextInputBuilder()
            .setCustomId('reporter_name')
            .setLabel('Nama Anda')
            .setPlaceholder('Masukkan nama Anda')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const bugDescriptionInput = new TextInputBuilder()
            .setCustomId('bug_description')
            .setLabel('Penjelasan Bug/Masalah')
            .setPlaceholder('Jelaskan secara detail bug/masalah yang Anda temukan...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
        
        const stepsToReproduceInput = new TextInputBuilder()
            .setCustomId('steps_to_reproduce')
            .setLabel('Langkah untuk Mereproduksi (Opsional)')
            .setPlaceholder('Langkah-langkah untuk mereproduksi bug (jika ada)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);
        
        const productRequestInput = new TextInputBuilder()
            .setCustomId('product_request')
            .setLabel('Penambahan Produk (Opsional)')
            .setPlaceholder('Jika Anda ingin request produk baru, jelaskan di sini')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);
        
        const additionalInfoInput = new TextInputBuilder()
            .setCustomId('additional_info')
            .setLabel('Informasi Tambahan (Opsional)')
            .setPlaceholder('Informasi tambahan yang mungkin berguna')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);
        
        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(bugDescriptionInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(stepsToReproduceInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(productRequestInput);
        const fifthActionRow = new ActionRowBuilder().addComponents(additionalInfoInput);
        
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error saat menampilkan form laporan bug:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan form laporan. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses laporan member
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} logsChannelId - ID channel untuk logs
 */
async function processMemberReport(interaction, logsChannelId) {
    try {
        // Mendapatkan nilai dari form
        const reporterName = interaction.fields.getTextInputValue('reporter_name');
        const reportedUser = interaction.fields.getTextInputValue('reported_user');
        const chronology = interaction.fields.getTextInputValue('chronology');
        const evidence = interaction.fields.getTextInputValue('evidence') || 'Tidak ada bukti yang diberikan';
        const additionalInfo = interaction.fields.getTextInputValue('additional_info') || 'Tidak ada informasi tambahan';
        
        // Membuat embed untuk laporan
        const reportEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚨 Laporan Member Baru')
            .addFields(
                { name: '👤 Pelapor', value: `${reporterName} (${interaction.user.tag})`, inline: true },
                { name: '🔴 Member yang Dilaporkan', value: reportedUser, inline: true },
                { name: '📅 Waktu Laporan', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📝 Kronologi', value: chronology, inline: false },
                { name: '🔍 Bukti', value: evidence, inline: false },
                { name: '📌 Informasi Tambahan', value: additionalInfo, inline: false }
            )
            .setFooter({ text: `ID Pelapor: ${interaction.user.id}` })
            .setTimestamp();
        
        // Tombol untuk menjawab laporan
        const replyButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`reply_report_${interaction.user.id}`)
                    .setLabel('Jawab')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✉️'),
                new ButtonBuilder()
                    .setCustomId(`auto_reply_${interaction.user.id}`)
                    .setLabel('Jawab Otomatis')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🤖')
            );
        
        // Mengirim laporan ke channel logs
        const logsChannel = await interaction.client.channels.fetch(logsChannelId).catch(() => null);
        if (logsChannel) {
            await logsChannel.send({ 
                embeds: [reportEmbed],
                components: [replyButtons]
            });
        } else {
            console.error(`Channel logs dengan ID ${logsChannelId} tidak ditemukan!`);
        }
        
        // Konfirmasi kepada pengguna
        await interaction.reply({
            content: '✅ Laporan Anda telah berhasil dikirim! Admin akan segera meninjau laporan ini. Terima kasih atas kontribusi Anda dalam menjaga komunitas.',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat memproses laporan member:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses laporan. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses laporan bug/request
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} logsChannelId - ID channel untuk logs
 */
async function processBugReport(interaction, logsChannelId) {
    try {
        // Mendapatkan nilai dari form
        const reporterName = interaction.fields.getTextInputValue('reporter_name');
        const bugDescription = interaction.fields.getTextInputValue('bug_description');
        const stepsToReproduce = interaction.fields.getTextInputValue('steps_to_reproduce') || 'Tidak ada langkah yang diberikan';
        const productRequest = interaction.fields.getTextInputValue('product_request') || 'Tidak ada request produk';
        const additionalInfo = interaction.fields.getTextInputValue('additional_info') || 'Tidak ada informasi tambahan';
        
        // Menentukan tipe laporan (bug atau request produk)
        const isProductRequest = productRequest !== 'Tidak ada request produk';
        const reportType = isProductRequest ? 'Request Produk' : 'Laporan Bug';
        const reportColor = isProductRequest ? '#00FFFF' : '#FF9900';
        const reportIcon = isProductRequest ? '🛒' : '🐛';
        
        // Membuat embed untuk laporan
        const reportEmbed = new EmbedBuilder()
            .setColor(reportColor)
            .setTitle(`${reportIcon} ${reportType} Baru`)
            .addFields(
                { name: '👤 Pelapor', value: `${reporterName} (${interaction.user.tag})`, inline: true },
                { name: '📅 Waktu Laporan', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📝 Deskripsi Bug/Masalah', value: bugDescription, inline: false }
            )
            .setFooter({ text: `ID Pelapor: ${interaction.user.id}` })
            .setTimestamp();
        
        // Tambahkan field berdasarkan tipe laporan
        if (isProductRequest) {
            reportEmbed.addFields(
                { name: '🛒 Request Produk', value: productRequest, inline: false },
                { name: '📌 Informasi Tambahan', value: additionalInfo, inline: false }
            );
        } else {
            reportEmbed.addFields(
                { name: '🔄 Langkah untuk Mereproduksi', value: stepsToReproduce, inline: false },
                { name: '📌 Informasi Tambahan', value: additionalInfo, inline: false }
            );
        }
        
        // Tombol untuk menjawab laporan
        const replyButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`reply_report_${interaction.user.id}`)
                    .setLabel('Jawab')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✉️'),
                new ButtonBuilder()
                    .setCustomId(`auto_reply_${interaction.user.id}`)
                    .setLabel('Jawab Otomatis')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🤖')
            );
        
        // Mengirim laporan ke channel logs
        const logsChannel = await interaction.client.channels.fetch(logsChannelId).catch(() => null);
        if (logsChannel) {
            await logsChannel.send({ 
                embeds: [reportEmbed],
                components: [replyButtons]
            });
        } else {
            console.error(`Channel logs dengan ID ${logsChannelId} tidak ditemukan!`);
        }
        
        // Konfirmasi kepada pengguna
        await interaction.reply({
            content: `✅ ${reportType} Anda telah berhasil dikirim! Admin akan segera meninjau laporan ini. Terima kasih atas kontribusi Anda dalam meningkatkan layanan kami.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat memproses laporan bug:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses laporan. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk menampilkan form jawaban manual
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} userId - ID user yang akan menerima jawaban
 */
async function showManualReplyForm(interaction, userId) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`manual_reply_modal_${userId}`)
            .setTitle('Jawab Laporan');
        
        const replyInput = new TextInputBuilder()
            .setCustomId('reply_content')
            .setLabel('Pesan Jawaban')
            .setPlaceholder('Ketik jawaban Anda untuk pelapor...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
        
        const actionRow = new ActionRowBuilder().addComponents(replyInput);
        modal.addComponents(actionRow);
        
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error saat menampilkan form jawaban:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan form jawaban. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk menampilkan pilihan jawaban otomatis
 * @param {Interaction} interaction - Interaksi Discord
 * @param {String} userId - ID user yang akan menerima jawaban
 */
async function showAutoReplyOptions(interaction, userId) {
    try {
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`auto_reply_select_${userId}`)
                    .setPlaceholder('Pilih jawaban otomatis')
                    .addOptions([
                        {
                            label: 'Terima Kasih atas Laporan',
                            description: 'Ucapan terima kasih atas laporan',
                            value: 'thanks',
                            emoji: '🙏'
                        },
                        {
                            label: 'Akan Segera Ditindaklanjuti',
                            description: 'Memberitahu bahwa laporan akan segera ditindaklanjuti',
                            value: 'action',
                            emoji: '⚡'
                        },
                        {
                            label: 'Sedang Dalam Investigasi',
                            description: 'Memberitahu bahwa laporan sedang diinvestigasi',
                            value: 'investigation',
                            emoji: '🔍'
                        },
                        {
                            label: 'Masalah Telah Diselesaikan',
                            description: 'Memberitahu bahwa masalah telah diselesaikan',
                            value: 'resolved',
                            emoji: '✅'
                        },
                        {
                            label: 'Butuh Informasi Tambahan',
                            description: 'Meminta informasi tambahan dari pelapor',
                            value: 'more_info',
                            emoji: '📝'
                        }
                    ])
            );
        
        await interaction.reply({
            content: 'Pilih jawaban otomatis yang ingin dikirim:',
            components: [row],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saat menampilkan pilihan jawaban otomatis:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat menampilkan pilihan jawaban otomatis. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk mengirim jawaban ke pelapor
 * @param {Client} client - Client Discord
 * @param {String} userId - ID user yang akan menerima jawaban
 * @param {String} message - Pesan jawaban
 * @param {String} adminTag - Tag admin yang menjawab
 */
async function sendReplyToReporter(client, userId, message, adminTag) {
    try {
        // Coba dapatkan user
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return { success: false, error: 'User tidak ditemukan' };
        }
        
        // Buat embed untuk jawaban
        const replyEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📬 Jawaban untuk Laporan Anda')
            .setDescription(message)
            .addFields(
                { name: '👤 Dijawab oleh', value: adminTag, inline: true },
                { name: '📅 Waktu Jawaban', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'Terima kasih telah menggunakan sistem pelaporan kami' })
            .setTimestamp();
        
        // Kirim DM ke user
        await user.send({ embeds: [replyEmbed] });
        
        return { success: true };
    } catch (error) {
        console.error('Error saat mengirim jawaban ke pelapor:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fungsi untuk memproses jawaban manual
 * @param {Interaction} interaction - Interaksi Discord
 */
async function processManualReply(interaction) {
    try {
        // Dapatkan ID user dari customId
        const userId = interaction.customId.replace('manual_reply_modal_', '');
        
        // Dapatkan pesan jawaban
        const replyContent = interaction.fields.getTextInputValue('reply_content');
        
        // Kirim jawaban ke pelapor
        const result = await sendReplyToReporter(interaction.client, userId, replyContent, interaction.user.tag);
        
        if (result.success) {
            await interaction.reply({
                content: '✅ Jawaban Anda telah berhasil dikirim ke pelapor!',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ Gagal mengirim jawaban: ${result.error}`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error saat memproses jawaban manual:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses jawaban. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk memproses jawaban otomatis
 * @param {Interaction} interaction - Interaksi Discord
 */
async function processAutoReply(interaction) {
    try {
        // Dapatkan ID user dari customId
        const userId = interaction.customId.replace('auto_reply_select_', '');
        
        // Dapatkan nilai yang dipilih
        const selectedValue = interaction.values[0];
        
        // Tentukan pesan berdasarkan nilai yang dipilih
        let replyMessage = '';
        switch (selectedValue) {
            case 'thanks':
                replyMessage = 'Terima kasih atas laporan Anda. Kami sangat menghargai kontribusi Anda dalam membantu kami meningkatkan layanan dan menjaga komunitas.';
                break;
            case 'action':
                replyMessage = 'Terima kasih atas laporan Anda. Kami akan segera menindaklanjuti masalah ini dan mengambil tindakan yang diperlukan.';
                break;
            case 'investigation':
                replyMessage = 'Laporan Anda sedang dalam proses investigasi. Kami sedang mengumpulkan informasi lebih lanjut dan akan segera mengambil tindakan yang sesuai.';
                break;
            case 'resolved':
                replyMessage = 'Kami ingin memberitahu bahwa masalah yang Anda laporkan telah kami selesaikan. Terima kasih atas laporan dan kesabaran Anda.';
                break;
            case 'more_info':
                replyMessage = 'Terima kasih atas laporan Anda. Kami membutuhkan informasi tambahan untuk menyelesaikan masalah ini. Mohon berikan detail lebih lanjut jika memungkinkan.';
                break;
            default:
                replyMessage = 'Terima kasih atas laporan Anda. Kami akan segera meninjau dan menindaklanjuti.';
        }
        
        // Kirim jawaban ke pelapor
        const result = await sendReplyToReporter(interaction.client, userId, replyMessage, interaction.user.tag);
        
        if (result.success) {
            await interaction.update({
                content: '✅ Jawaban otomatis telah berhasil dikirim ke pelapor!',
                components: []
            });
        } else {
            await interaction.update({
                content: `❌ Gagal mengirim jawaban: ${result.error}`,
                components: []
            });
        }
    } catch (error) {
        console.error('Error saat memproses jawaban otomatis:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses jawaban. Silakan coba lagi.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Fungsi untuk membuat pesan dengan tombol report
 * @param {Client} client - Client Discord
 * @param {String} channelId - ID channel untuk mengirim pesan
 */
async function setupReportSystem(client, channelId) {
    try {
        // Mendapatkan channel berdasarkan ID
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            console.error(`Channel dengan ID ${channelId} tidak ditemukan!`);
            return;
        }
        
        // Membuat embed untuk pesan report
        const reportEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('📢 Sistem Pelaporan')
            .setDescription('Gunakan tombol di bawah ini untuk melaporkan masalah atau member yang melanggar aturan.')
            .addFields(
                { name: '👤 Laporkan Member', value: 'Laporkan member yang melanggar aturan server', inline: false },
                { name: '🐛 Laporkan Bug', value: 'Laporkan bug atau masalah yang Anda temukan', inline: false },
                { name: '🛒 Request Produk', value: 'Request produk baru yang ingin Anda lihat', inline: false }
            )
            .setFooter({ text: 'Klik tombol Report di bawah untuk memulai' })
            .setTimestamp();
        
        // Mengirim pesan dengan tombol report
        await channel.send({
            embeds: [reportEmbed],
            components: [createReportButton()]
        });
        
        console.log(`Sistem report berhasil diatur di channel ${channel.name}`);
    } catch (error) {
        console.error('Error saat mengatur sistem report:', error);
    }
}

// Export fungsi-fungsi
module.exports = {
    createReportButton,
    showReportOptions,
    showMemberReportForm,
    showBugReportForm,
    processMemberReport,
    processBugReport,
    setupReportSystem,
    showManualReplyForm,
    showAutoReplyOptions,
    processManualReply,
    processAutoReply
}; 