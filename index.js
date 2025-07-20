const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('./config');
const crypto = require('crypto');

// Membuat instance client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Menyimpan URL QRIS default
let qrisImageUrl = 'https://i.ibb.co/PxGF0zc/qris-sample.png'; // URL default untuk QRIS

// Menyimpan informasi pembelian terakhir
const lastPurchases = new Map();

// Menyimpan giveaway aktif
const activeGiveaways = new Map();

// Mengimpor modul status bot
const statusBot = require('./fitur/statusBot');
console.log('Status Bot Module:', statusBot); // Tambahkan log untuk debugging

// Mengimpor modul logs aktivitas
const logsAktivitas = require('./fitur/logsAktivitas');

// Mengimpor modul report system
const reportSystem = require('./fitur/reportSystem');

// Mengimpor modul informasi system
const informasiSystem = require('./fitur/informasiSystem');

// Mengimpor modul garansi system
const garansiSystem = require('./fitur/garansiSystem');

// Mengimpor modul testimoni system
const testimoniSystem = require('./fitur/testimoniSystem');

// Mendefinisikan slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('ann-embed')
        .setDescription('Membuat dan mengirim pengumuman dengan embed')
        .addStringOption(option => 
            option.setName('judul')
                .setDescription('Judul pengumuman')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('deskripsi')
                .setDescription('Isi pengumuman')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('warna')
                .setDescription('Warna embed (format hex: #RRGGBB)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('gambar')
                .setDescription('URL gambar untuk ditampilkan di embed')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('footer')
                .setDescription('Teks footer untuk embed')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('channel_id')
                .setDescription('ID channel tujuan pengumuman (kosongkan untuk channel saat ini)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('style')
                .setDescription('Style teks untuk deskripsi')
                .setRequired(false)
                .addChoices(
                    { name: 'Normal', value: 'normal' },
                    { name: 'Bold', value: 'bold' },
                    { name: 'Italic', value: 'italic' },
                    { name: 'Underline', value: 'underline' },
                    { name: 'Code Block', value: 'codeblock' },
                    { name: 'Quote Block', value: 'quoteblock' }
                )),
    new SlashCommandBuilder()
        .setName('addproduct')
        .setDescription('Menambahkan produk baru ke dalam channel')
        .addStringOption(option => 
            option.setName('judul')
                .setDescription('Judul produk')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('deskripsi')
                .setDescription('Deskripsi produk')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('urlimage')
                .setDescription('URL gambar produk')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Mengirim permintaan pembayaran ke customer')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan menerima permintaan pembayaran (opsional)')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('harga')
                .setDescription('Harga produk (opsional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('pay_custom')
        .setDescription('Mengatur URL gambar QRIS untuk pembayaran')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('URL gambar QRIS')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Membuat dan mengelola giveaway')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Membuat giveaway baru')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('Hadiah yang akan diberikan')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Jumlah pemenang')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Durasi giveaway dalam menit')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10080)) // Max 1 week
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Deskripsi tambahan untuk giveaway')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('URL gambar untuk giveaway')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Mengakhiri giveaway yang sedang berlangsung')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID pesan giveaway yang akan diakhiri')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Memilih pemenang baru untuk giveaway yang sudah berakhir')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID pesan giveaway yang akan di-reroll')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Memperbarui status bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('giveawayroll')
        .setDescription('Membuat giveaway langsung di channel ini')
        .addStringOption(option =>
            option.setName('produk')
                .setDescription('Nama produk yang akan diberikan')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('durasi')
                .setDescription('Durasi giveaway dalam menit')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10080)) // Max 1 week
        .addStringOption(option =>
            option.setName('deskripsi')
                .setDescription('Deskripsi tambahan untuk giveaway')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('gambar')
                .setDescription('URL gambar untuk giveaway')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('setupreport')
        .setDescription('Mengatur sistem pelaporan di channel saat ini')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('informasi')
        .setDescription('Membuat dan mengirim informasi ke channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('setupgaransi')
        .setDescription('Mengatur sistem garansi di channel tertentu')
        .addStringOption(option =>
            option.setName('channel_id')
                .setDescription('ID channel untuk mengatur sistem garansi (kosongkan untuk channel saat ini)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// Event ketika bot siap
client.once('ready', async () => {
    console.log(`Bot telah online sebagai ${client.user.tag}`);
    
    // Mendaftarkan slash commands
    try {
        console.log('Memulai refresh aplikasi (/) commands.');
        
        const rest = new REST({ version: '10' }).setToken(config.token);
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        
        console.log('Berhasil me-refresh aplikasi (/) commands.');
    } catch (error) {
        console.error('Terjadi kesalahan saat mendaftarkan commands:', error);
    }
    
    // Setup logs aktivitas
    logsAktivitas.setupActivityLogs(client, config.activityLogsChannelId);
    
    // Setup sistem garansi
    try {
        await garansiSystem.setupGaransiSystem(client, config.garansiChannelId);
        console.log('Sistem garansi berhasil diatur.');
    } catch (error) {
        console.error('Terjadi kesalahan saat mengatur sistem garansi:', error);
    }
    
    // Mencari channel berdasarkan ID
    const channel = await client.channels.fetch(config.channelId);
    if (!channel) return console.error('Channel tidak ditemukan!');
    
    // Hapus pesan-pesan sebelumnya di channel (opsional)
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        await channel.bulkDelete(messages);
    } catch (error) {
        console.log('Tidak dapat menghapus pesan sebelumnya:', error);
    }
    
    // Membuat embed pesan verifikasi
    const verifyEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Verifikasi Member')
        .setDescription('Klik tombol di bawah untuk memverifikasi diri Anda dan mendapatkan akses ke server.')
        .setFooter({ text: 'Sistem Verifikasi Otomatis' });
    
    // Membuat tombol verifikasi
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );
    
    // Kirim pesan dengan tombol
    await channel.send({
        embeds: [verifyEmbed],
        components: [row]
    });
    
    // Memperbarui status bot untuk pertama kali
    try {
    await statusBot.updateBotStatus(client, config.statusChannelId);
    
    // Memperbarui status bot setiap 5 menit
    setInterval(() => {
        statusBot.updateBotStatus(client, config.statusChannelId);
    }, 5 * 60 * 1000);
    } catch (error) {
        console.error('Error saat memperbarui status bot:', error);
    }
    
    // Cek giveaway yang sedang berjalan
    setInterval(checkGiveaways, 10000); // Cek setiap 10 detik
});

// Event saat guild baru ditambahkan
client.on('guildCreate', async () => {
    // Memperbarui status bot saat bot bergabung ke server baru
    try {
    await statusBot.updateBotStatus(client, config.statusChannelId);
    } catch (error) {
        console.error('Error saat memperbarui status bot (guildCreate):', error);
    }
});

// Event saat guild dihapus
client.on('guildDelete', async () => {
    // Memperbarui status bot saat bot keluar dari server
    try {
    await statusBot.updateBotStatus(client, config.statusChannelId);
    } catch (error) {
        console.error('Error saat memperbarui status bot (guildDelete):', error);
    }
});

// Event saat member bergabung
client.on('guildMemberAdd', async () => {
    // Memperbarui status bot saat member baru bergabung
    setTimeout(() => {
        try {
        statusBot.updateBotStatus(client, config.statusChannelId);
        } catch (error) {
            console.error('Error saat memperbarui status bot (guildMemberAdd):', error);
        }
    }, 5000); // Delay 5 detik untuk menghindari terlalu banyak update
});

// Event saat member keluar
client.on('guildMemberRemove', async () => {
    // Memperbarui status bot saat member keluar
    setTimeout(() => {
        try {
        statusBot.updateBotStatus(client, config.statusChannelId);
        } catch (error) {
            console.error('Error saat memperbarui status bot (guildMemberRemove):', error);
        }
    }, 5000); // Delay 5 detik untuk menghindari terlalu banyak update
});

// Fungsi untuk memeriksa giveaway yang sedang berjalan
async function checkGiveaways() {
    for (const [messageId, giveaway] of activeGiveaways.entries()) {
        if (giveaway.endTime <= Date.now()) {
            try {
                // Pastikan channelId ada dan valid
                if (!giveaway.channelId) {
                    console.error(`Giveaway dengan ID ${messageId} tidak memiliki channelId yang valid. Menghapus dari daftar aktif.`);
                    activeGiveaways.delete(messageId);
                    continue;
                }
                
                const channel = await client.channels.fetch(giveaway.channelId).catch(err => {
                    console.error(`Error saat mengambil channel untuk giveaway ${messageId}:`, err);
                    return null;
                });
                
                if (!channel) {
                    console.error(`Channel dengan ID ${giveaway.channelId} untuk giveaway ${messageId} tidak ditemukan. Menghapus dari daftar aktif.`);
                    activeGiveaways.delete(messageId);
                    continue;
                }
                
                // Pastikan messageId ada dan valid
                const message = await channel.messages.fetch(messageId).catch(err => {
                    console.error(`Error saat mengambil pesan untuk giveaway ${messageId}:`, err);
                    return null;
                });
                
                if (!message) {
                    console.error(`Pesan dengan ID ${messageId} tidak ditemukan di channel ${giveaway.channelId}. Menghapus dari daftar aktif.`);
                    activeGiveaways.delete(messageId);
                    continue;
                }
                
                // Acak pemenang
                let winners = [];
                if (giveaway.participants && giveaway.participants.length > 0) {
                    // Shuffle participants
                    const shuffled = [...giveaway.participants].sort(() => 0.5 - Math.random());
                    winners = shuffled.slice(0, Math.min(giveaway.winners || 1, shuffled.length));
                }
                
                // Buat daftar pemenang
                let winnersList = winners.length > 0 
                    ? winners.map(id => `<@${id}>`).join(', ')
                    : 'Tidak ada pemenang (tidak ada peserta)';
                
                // Update embed giveaway
                const endedEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`🎉 Giveaway Berakhir: ${giveaway.prize}`)
                    .setDescription(`**Pemenang:** ${winnersList}\n\n${giveaway.description || ''}`)
                    .setImage(giveaway.image)
                    .setTimestamp()
                    .setFooter({ text: 'Giveaway telah berakhir' });
                
                // Tombol reroll
                const rerollRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`giveaway_reroll_${messageId}`)
                            .setLabel('Reroll Pemenang')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔄')
                    );
                
                await message.edit({
                    embeds: [endedEmbed],
                    components: [rerollRow]
                });
                
                // Kirim pengumuman pemenang
                if (winners.length > 0) {
                    await channel.send({
                        content: `🎉 Selamat kepada ${winnersList} yang memenangkan **${giveaway.prize}**!`,
                        allowedMentions: { users: winners }
                    });
                    
                    // Pastikan guild ada sebelum membuat tiket
                    if (!message.guild) {
                        console.error(`Tidak dapat membuat tiket: guild tidak ditemukan untuk pesan ${messageId}`);
                        continue;
                    }
                    
                    // Buat tiket untuk setiap pemenang
                    for (const winnerId of winners) {
                        try {
                            // Dapatkan kategori tiket dari konfigurasi
                            const ticketCategory = await client.channels.fetch(config.giveawayTicketCategoryId).catch(err => {
                                console.error(`Error saat mengambil kategori tiket:`, err);
                                return null;
                            });
                            
                            if (!ticketCategory) {
                                console.error(`Kategori tiket giveaway dengan ID ${config.giveawayTicketCategoryId} tidak ditemukan!`);
                                continue;
                            }
                            
                            // Dapatkan informasi pemenang
                            const winner = await client.users.fetch(winnerId).catch(err => {
                                console.error(`Error saat mengambil informasi user ${winnerId}:`, err);
                                return null;
                            });
                            
                            if (!winner) {
                                console.error(`User dengan ID ${winnerId} tidak ditemukan!`);
                                continue;
                            }
                            
                            // Buat nama channel tiket
                            const ticketChannelName = `giveaway-${winner.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
                            
                            // Buat channel tiket
                            const ticketChannel = await message.guild.channels.create({
                                name: ticketChannelName,
                                type: ChannelType.GuildText,
                                parent: ticketCategory.id,
                                permissionOverwrites: [
                                    {
                                        id: message.guild.id, // @everyone role
                                        deny: [PermissionFlagsBits.ViewChannel]
                                    },
                                    {
                                        id: winnerId,
                                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                                    },
                                    {
                                        id: config.adminRoleId,
                                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
                                    }
                                ]
                            });
                            
                            // Buat embed untuk tiket
                            const ticketEmbed = new EmbedBuilder()
                                .setColor('#57F287')
                                .setTitle('🎉 Selamat! Anda Memenangkan Giveaway')
                                .setDescription(`Halo <@${winnerId}>, selamat atas kemenangan Anda di giveaway **${giveaway.prize}**!\n\nAdmin akan segera menghubungi Anda untuk memberikan hadiah Anda. Silakan tunggu sebentar.`)
                                .addFields(
                                    { name: '🎁 Hadiah', value: giveaway.prize, inline: true },
                                    { name: '🏆 Pemenang', value: `<@${winnerId}>`, inline: true },
                                    { name: '📅 Tanggal Menang', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                                )
                                .setFooter({ text: `Ticket ID: ${ticketChannel.id}` })
                                .setTimestamp();
                            
                            // Tombol untuk menutup tiket
                            const ticketRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`close_ticket_${ticketChannel.id}`)
                                        .setLabel('Tutup Tiket')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('🔒')
                                );
                            
                            // Kirim pesan di tiket
                            await ticketChannel.send({
                                content: `<@${winnerId}> <@&${config.adminRoleId}>`,
                                embeds: [ticketEmbed],
                                components: [ticketRow]
                            });
                            
                            // Log pembuatan tiket
                            console.log(`Tiket giveaway dibuat untuk pemenang ${winner.tag} (${winnerId}) - Hadiah: ${giveaway.prize}`);
                        } catch (ticketError) {
                            console.error(`Error saat membuat tiket untuk pemenang ${winnerId}:`, ticketError);
                        }
                    }
                    
                    // Kirim logs giveaway berakhir dengan pemenang
                    try {
                        const logsChannel = await client.channels.fetch(config.giveawayLogsChannelId).catch(() => null);
                        if (logsChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#FF9900')
                                .setTitle('🏆 Giveaway Berakhir - Dengan Pemenang')
                                .addFields(
                                    { name: '🎁 Hadiah', value: giveaway.prize, inline: true },
                                    { name: '👥 Total Peserta', value: `${giveaway.participants ? giveaway.participants.length : 0}`, inline: true },
                                    { name: '🏆 Jumlah Pemenang', value: `${winners.length}`, inline: true },
                                    { name: '🎯 Pemenang', value: winnersList, inline: false }
                                )
                                .setTimestamp();
                            
                            await logsChannel.send({ embeds: [logEmbed] });
                        }
                    } catch (error) {
                        console.error('Error saat mengirim logs giveaway berakhir:', error);
                    }
                } else {
                    await channel.send(`❌ Tidak ada pemenang untuk giveaway **${giveaway.prize}** karena tidak ada peserta.`);
                    
                    // Kirim logs giveaway berakhir tanpa pemenang
                    try {
                        const logsChannel = await client.channels.fetch(config.giveawayLogsChannelId).catch(() => null);
                        if (logsChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Giveaway Berakhir - Tanpa Pemenang')
                                .addFields(
                                    { name: '🎁 Hadiah', value: giveaway.prize, inline: true },
                                    { name: '📝 Alasan', value: 'Tidak ada peserta yang bergabung', inline: false }
                                )
                                .setTimestamp();
                            
                            await logsChannel.send({ embeds: [logEmbed] });
                        }
                    } catch (error) {
                        console.error('Error saat mengirim logs giveaway berakhir:', error);
                    }
                }
                
                // Hapus dari giveaway aktif
                activeGiveaways.delete(messageId);
            } catch (error) {
                console.error('Error saat mengakhiri giveaway:', error);
                // Hapus giveaway yang bermasalah untuk mencegah error berulang
                activeGiveaways.delete(messageId);
            }
        }
    }
}

// Event untuk menangani interaksi tombol
client.on(Events.InteractionCreate, async interaction => {
    // Menangani slash commands
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ann-embed') {
            try {
                // Memeriksa apakah pengguna memiliki role admin yang ditentukan
                const hasAdminRole = interaction.member.roles.cache.has(config.adminRoleId);
                
                if (!hasAdminRole) {
                    return await interaction.reply({
                        content: '❌ Anda tidak memiliki izin untuk menggunakan command ini! Command ini hanya tersedia untuk role admin tertentu.',
                        ephemeral: true
                    });
                }
                
                // Mengambil opsi dari command
                const judul = interaction.options.getString('judul');
                let deskripsi = interaction.options.getString('deskripsi');
                const warna = interaction.options.getString('warna') || '#0099FF';
                const gambar = interaction.options.getString('gambar');
                const footer = interaction.options.getString('footer');
                const channelId = interaction.options.getString('channel_id');
                const style = interaction.options.getString('style') || 'normal';
                
                // Menerapkan style pada teks deskripsi
                switch (style) {
                    case 'bold':
                        deskripsi = `**${deskripsi}**`;
                        break;
                    case 'italic':
                        deskripsi = `*${deskripsi}*`;
                        break;
                    case 'underline':
                        deskripsi = `__${deskripsi}__`;
                        break;
                    case 'codeblock':
                        deskripsi = `\`\`\`\n${deskripsi}\n\`\`\``;
                        break;
                    case 'quoteblock':
                        // Menambahkan '> ' di awal setiap baris
                        deskripsi = deskripsi.split('\n').map(line => `> ${line}`).join('\n');
                        break;
                    default:
                        // Normal, tidak perlu perubahan
                        break;
                }
                
                // Membuat embed pengumuman dengan style yang lebih menarik
                const announcementEmbed = new EmbedBuilder()
                    .setColor(warna)
                    .setTitle(`📢 ${judul}`)
                    .setDescription(deskripsi)
                    .setTimestamp()
                    .setAuthor({ 
                        name: interaction.user.username, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });
                
                // Menambahkan gambar jika ada
                if (gambar) {
                    announcementEmbed.setImage(gambar);
                }
                
                // Menambahkan footer jika ada
                if (footer) {
                    announcementEmbed.setFooter({ 
                        text: footer,
                        iconURL: interaction.guild.iconURL()
                    });
                } else {
                    announcementEmbed.setFooter({ 
                        text: `${interaction.guild.name} • ${new Date().toLocaleDateString()}`,
                        iconURL: interaction.guild.iconURL()
                    });
                }
                
                // Menentukan channel tujuan
                let targetChannel;
                if (channelId) {
                    targetChannel = await interaction.client.channels.fetch(channelId).catch(() => null);
                    if (!targetChannel) {
                        return await interaction.reply({ 
                            content: '❌ Channel tujuan tidak ditemukan! Pastikan ID channel valid.', 
                            ephemeral: true 
                        });
                    }
                } else {
                    targetChannel = interaction.channel;
                }
                
                // Mengirim pengumuman ke channel tujuan
                await targetChannel.send({ embeds: [announcementEmbed] });
                
                // Memberi tahu pengguna bahwa pengumuman berhasil dikirim
                await interaction.reply({ 
                    content: `✅ Pengumuman berhasil dikirim ke channel ${targetChannel.name}!`, 
                    ephemeral: true 
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat mengirim pengumuman:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat mengirim pengumuman. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        } else if (interaction.commandName === 'addproduct') {
            try {
                // Memeriksa apakah pengguna memiliki role admin yang ditentukan
                const hasAdminRole = interaction.member.roles.cache.has(config.adminRoleId);
                
                if (!hasAdminRole) {
                    return await interaction.reply({
                        content: '❌ Anda tidak memiliki izin untuk menggunakan command ini! Command ini hanya tersedia untuk role admin tertentu.',
                        ephemeral: true
                    });
    }
    
                // Mengambil opsi dari command
                const judul = interaction.options.getString('judul');
                const deskripsi = interaction.options.getString('deskripsi');
                const urlImage = interaction.options.getString('urlimage');
                
                // Membuat embed produk
                const productEmbed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle(`🛒 ${judul}`)
                    .setDescription(deskripsi)
                    .setImage(urlImage)
                    .setTimestamp()
                    .setFooter({ 
                        text: `${interaction.guild.name} • Produk`,
                        iconURL: interaction.guild.iconURL()
                    });
                
                // Membuat tombol Harga saja (tanpa Buy Product)
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`set_price_${Date.now()}`)
                            .setLabel('Harga')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💰')
                    );
                
                // Mengirim produk ke channel saat ini
                await interaction.channel.send({
                    embeds: [productEmbed],
                    components: [row]
                });
                
                // Memberi tahu pengguna bahwa produk berhasil ditambahkan
                await interaction.reply({ 
                    content: `✅ Produk ${judul} berhasil ditambahkan ke channel! Silakan atur harga produk terlebih dahulu sebelum produk dapat dibeli.`, 
                    ephemeral: true 
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat menambahkan produk:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat menambahkan produk. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        } else if (interaction.commandName === 'pay') {
            try {
                // Tambahkan parameter opsional untuk user dan harga jika diperlukan
                const targetUser = interaction.options.getUser('user') || interaction.user;
                const customPrice = interaction.options.getNumber('harga') || 0;
                
                // Membuat embed untuk pilihan metode pembayaran
                const paymentEmbed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('Pilih Metode Pembayaran')
                    .setDescription(`Halo <@${targetUser.id}>, silakan pilih metode pembayaran untuk pesanan Anda`)
                    .addFields(
                        { name: 'Total Belanja', value: customPrice > 0 ? `Rp ${customPrice.toLocaleString('id-ID')}` : 'Sesuai pilihan produk', inline: false }
                    )
                    .setFooter({ 
                        text: 'Biaya admin akan ditambahkan sesuai metode yang dipilih.',
                        iconURL: interaction.guild.iconURL()
                    });
    
                // Membuat tombol QRIS
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`pay_confirm_${targetUser.id}_Produk_${customPrice || 0}_${Date.now()}`)
                            .setLabel(`QRIS Realtime`)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💳')
                    );
                
                // Mengirim pesan ke channel
                await interaction.reply({
                    content: `Panel pemilihan pembayaran telah dikirim.`,
                    embeds: [paymentEmbed],
                    components: [row]
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat mengirim permintaan pembayaran:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat mengirim permintaan pembayaran. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        } else if (interaction.commandName === 'pay_custom') {
            try {
                const url = interaction.options.getString('url');
                qrisImageUrl = url;
                await interaction.reply({
                    content: `✅ URL QRIS untuk pembayaran berhasil diatur ke: ${url}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat mengatur URL QRIS:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat mengatur URL QRIS. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        } else if (interaction.commandName === 'giveaway') {
            try {
                const subcommand = interaction.options.getSubcommand();
                if (subcommand === 'create') {
                    const prize = interaction.options.getString('prize');
                    const winners = interaction.options.getInteger('winners');
                    const duration = interaction.options.getInteger('duration');
                    const description = interaction.options.getString('description');
                    const image = interaction.options.getString('image');

                    // Membuat embed giveaway
                    const giveawayEmbed = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle(`🎉 GIVEAWAY: ${prize}`)
                        .setDescription(`**Hadiah:** ${prize}\n**Jumlah Pemenang:** ${winners}\n**Berakhir:** <t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>\n\n${description || 'Klik tombol di bawah untuk bergabung!'}`)
                        .setImage(image)
                        .setTimestamp()
                        .setFooter({ text: `Dibuat oleh ${interaction.user.tag}` });

                    // Tombol untuk bergabung giveaway
                    const giveawayRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`giveaway_join`)
                                .setLabel('Join Giveaway')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('🎉')
                        );

                    // Kirim pesan giveaway
                    const giveawayMessage = await interaction.channel.send({
                        embeds: [giveawayEmbed],
                        components: [giveawayRow]
                    });

                    // Simpan data giveaway
                    activeGiveaways.set(giveawayMessage.id, {
                        messageId: giveawayMessage.id,
                        channelId: interaction.channel.id,
                        prize: prize,
                        winners: winners,
                        duration: duration,
                        endTime: Date.now() + duration * 60000,
                        description: description,
                        image: image,
                        participants: [],
                        createdBy: interaction.user.id
                    });

                    // Kirim logs giveaway dibuat
                    try {
                        const logsChannel = await interaction.client.channels.fetch(config.giveawayLogsChannelId).catch(() => null);
                        if (logsChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#57F287')
                                .setTitle('🎉 Giveaway Baru Dibuat')
                                .addFields(
                                    { name: '👤 Admin', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                                    { name: '🎁 Hadiah', value: prize, inline: true },
                                    { name: '🏆 Jumlah Pemenang', value: `${winners}`, inline: true },
                                    { name: '⏱️ Durasi', value: `${duration} menit`, inline: true },
                                    { name: '📝 Deskripsi', value: description || 'Tidak ada deskripsi', inline: false }
                                )
                                .setThumbnail(interaction.user.displayAvatarURL())
                                .setTimestamp();
                            
                            await logsChannel.send({ embeds: [logEmbed] });
                        }
                    } catch (error) {
                        console.error('Error saat mengirim logs giveaway dibuat:', error);
                    }

                    await interaction.reply({
                        content: `✅ Giveaway untuk **${prize}** berhasil dibuat! Akan berakhir ${duration} menit dari sekarang.`,
                        ephemeral: true
                    });
                } else if (subcommand === 'end') {
                    const messageId = interaction.options.getString('message_id');
                    
                    if (!activeGiveaways.has(messageId)) {
                        return await interaction.reply({
                            content: '❌ Giveaway dengan ID tersebut tidak ditemukan atau sudah berakhir.',
                            ephemeral: true
                        });
                    }
                    
                    const giveaway = activeGiveaways.get(messageId);
                    giveaway.endTime = Date.now(); // Force end immediately
                    
                    await interaction.reply({
                        content: `✅ Giveaway untuk **${giveaway.prize}** akan segera diakhiri.`,
                        ephemeral: true
                    });
                    
                    // checkGiveaways akan menangani sisanya
                } else if (subcommand === 'reroll') {
                    const messageId = interaction.options.getString('message_id');
                    const channel = interaction.channel;
                    
                    try {
                        // Coba ambil pesan
                        const message = await channel.messages.fetch(messageId);
                        if (!message) {
                            return await interaction.reply({
                                content: '❌ Pesan giveaway tidak ditemukan di channel ini.',
                                ephemeral: true
                            });
                        }
                        
                        // Cek apakah ini adalah pesan giveaway yang sudah berakhir
                        const embed = message.embeds[0];
                        if (!embed || !embed.title || !embed.title.includes('Giveaway Berakhir')) {
                            return await interaction.reply({
                                content: '❌ Pesan ini bukan giveaway yang sudah berakhir.',
                                ephemeral: true
                            });
                        }
                        
                        // Ambil data giveaway dari embed
                        const prize = embed.title.replace('🎉 Giveaway Berakhir: ', '');
                        
                        // Cari semua reaksi pada pesan
                        const reactions = message.reactions.cache.get('🎉');
                        if (!reactions || reactions.count <= 1) {
                            return await interaction.reply({
                                content: '❌ Tidak ada peserta dalam giveaway ini.',
                                ephemeral: true
                            });
                        }
                        
                        // Ambil semua user yang bereaksi
                        const users = await reactions.users.fetch();
                        const participants = users.filter(user => !user.bot).map(user => user.id);
                        
                        if (participants.length === 0) {
                            return await interaction.reply({
                                content: '❌ Tidak ada peserta dalam giveaway ini.',
                                ephemeral: true
                            });
                        }
                        
                        // Pilih pemenang baru secara acak
                        const winner = participants[Math.floor(Math.random() * participants.length)];
                        
                        await channel.send({
                            content: `🎉 Pemenang baru untuk giveaway **${prize}** adalah: <@${winner}>!`,
                            allowedMentions: { users: [winner] }
                        });
                        
                        await interaction.reply({
                            content: `✅ Berhasil memilih pemenang baru untuk giveaway **${prize}**.`,
                            ephemeral: true
                        });
                        
                    } catch (error) {
                        console.error('Error saat reroll giveaway:', error);
                        await interaction.reply({
                            content: '❌ Terjadi kesalahan saat melakukan reroll. Pastikan ID pesan valid.',
                            ephemeral: true
                        });
                    }
                }
            } catch (error) {
                console.error('Terjadi kesalahan saat mengelola giveaway:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat mengelola giveaway. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        } else if (interaction.commandName === 'status') {
            try {
                await statusBot.updateBotStatus(client, config.statusChannelId);
                await interaction.reply({
                    content: '✅ Status bot berhasil diperbarui!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat memperbarui status bot:', error);
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat memperbarui status bot. Silakan coba lagi.',
                    ephemeral: true
                });
            }
        } else if (interaction.commandName === 'giveawayroll') {
            try {
                const productName = interaction.options.getString('produk');
                const duration = interaction.options.getInteger('durasi');
                const description = interaction.options.getString('deskripsi');
                const image = interaction.options.getString('gambar');
                
                // Gunakan channel tempat command dijalankan
                const targetChannel = interaction.channel;

                if (!productName || !duration) {
                    return await interaction.reply({
                        content: '❌ Nama produk dan durasi harus diisi!',
                        ephemeral: true
                    });
                }

                // Membuat embed giveaway
                const giveawayEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle(`🎉 GIVEAWAY: ${productName}`)
                    .setDescription(`**Hadiah:** ${productName}\n**Jumlah Pemenang:** 1\n**Berakhir:** <t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>\n\n${description || 'Klik tombol di bawah untuk bergabung!'}`)
                    .setImage(image || null)
                    .setTimestamp()
                    .setFooter({ text: `Dibuat oleh ${interaction.user.tag}` });
                
                // Tombol untuk bergabung giveaway
                const giveawayRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`giveaway_join`)
                            .setLabel('Join Giveaway')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('🎉')
                    );
                
                // Kirim pesan giveaway ke channel
                const sentMessage = await targetChannel.send({
                    embeds: [giveawayEmbed],
                    components: [giveawayRow]
                }).catch(err => {
                    console.error('Error saat mengirim pesan giveaway:', err);
                    return null;
                });
                
                if (!sentMessage) {
                    return await interaction.reply({
                        content: '❌ Tidak dapat mengirim pesan giveaway ke channel.',
                        ephemeral: true
                    });
                }
                
                // Simpan data giveaway
                const giveawayData = {
                    messageId: sentMessage.id,
                    channelId: targetChannel.id,
                    prize: productName,
                    winners: 1,
                    duration: duration,
                    endTime: Date.now() + duration * 60000,
                    description: description || '',
                    image: image || null,
                    participants: [],
                    createdBy: interaction.user.id,
                    isActive: true
                };
                
                // Simpan giveaway ke daftar aktif
                activeGiveaways.set(sentMessage.id, giveawayData);

                // Kirim logs giveaway dibuat
                try {
                    const logsChannel = await interaction.client.channels.fetch(config.giveawayLogsChannelId).catch(() => null);
                    if (logsChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#57F287')
                            .setTitle('🎉 Giveaway Baru Dibuat')
                            .addFields(
                                { name: '👤 Admin', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                                { name: '🎁 Hadiah', value: productName, inline: true },
                                { name: '🏆 Jumlah Pemenang', value: '1', inline: true },
                                { name: '⏱️ Durasi', value: `${duration} menit`, inline: true },
                                { name: '📝 Deskripsi', value: description || 'Tidak ada deskripsi', inline: false },
                                { name: '📢 Channel', value: `<#${targetChannel.id}>`, inline: false }
                            )
                            .setThumbnail(interaction.user.displayAvatarURL())
                            .setTimestamp();
                        
                        await logsChannel.send({ embeds: [logEmbed] });
                    }
                } catch (error) {
                    console.error('Error saat mengirim logs giveaway dibuat:', error);
                }

                await interaction.reply({
                    content: `✅ Giveaway untuk **${productName}** berhasil dibuat di channel ini!\n\n**Durasi:** ${duration} menit\n**Berakhir pada:** <t:${Math.floor((Date.now() + duration * 60000) / 1000)}:F>`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat membuat giveaway:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat membuat giveaway. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        } else if (interaction.commandName === 'setupreport') {
            try {
                await reportSystem.setupReportSystem(client, interaction.channel.id);
                await interaction.reply({
                    content: '✅ Sistem pelaporan berhasil diatur di channel ini!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat mengatur sistem pelaporan:', error);
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat mengatur sistem pelaporan. Silakan coba lagi.',
                    ephemeral: true
                });
            }
        } else if (interaction.commandName === 'informasi') {
            try {
                await informasiSystem.showInformasiForm(interaction);
            } catch (error) {
                console.error('Terjadi kesalahan saat menampilkan form informasi:', error);
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat menampilkan form informasi. Silakan coba lagi.',
                    ephemeral: true
                });
            }
        } else if (interaction.commandName === 'setupgaransi') {
            try {
                const channelId = interaction.options.getString('channel_id') || interaction.channelId;
                await garansiSystem.setupGaransiSystem(client, channelId);
                
                // Dapatkan nama channel
                const channel = await client.channels.fetch(channelId).catch(() => null);
                const channelName = channel ? channel.name : 'yang ditentukan';
                
                await interaction.reply({
                    content: `✅ Sistem garansi berhasil diatur di channel #${channelName}!`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat mengatur sistem garansi:', error);
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat mengatur sistem garansi. Silakan coba lagi.',
                    ephemeral: true
                });
            }
        }
    }
    
    // Menangani modal submissions
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('price_modal_')) {
            try {
                // Mendapatkan nilai dari input modal
                const harga1 = interaction.fields.getTextInputValue('harga1') || 'Tidak tersedia';
                const harga2 = interaction.fields.getTextInputValue('harga2') || 'Tidak tersedia';
                const harga3 = interaction.fields.getTextInputValue('harga3') || 'Tidak tersedia';
                const harga4 = interaction.fields.getTextInputValue('harga4') || 'Tidak tersedia';
                
                // Mendapatkan ID pesan dari customId
                const parts = interaction.customId.split('_');
                const messageId = parts[2];
                
                // Mendapatkan pesan yang berisi produk
                const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
                if (!message) {
                    return await interaction.reply({
                        content: '❌ Pesan produk tidak ditemukan.',
                        ephemeral: true
                    });
                }
                
                // Mendapatkan embed produk lama
                const oldEmbed = message.embeds[0];
                
                // Membuat embed produk baru dengan harga
                const newEmbed = EmbedBuilder.from(oldEmbed)
                    .addFields(
                        { name: '💰 Harga 1', value: `Rp ${harga1}`, inline: true },
                        { name: '💰 Harga 2', value: `Rp ${harga2}`, inline: true },
                        { name: '💰 Harga 3', value: `Rp ${harga3}`, inline: true },
                        { name: '💰 Harga 4', value: `Rp ${harga4}`, inline: true }
                    );
                
                // Membuat tombol baru dengan Buy Product saja (tanpa tombol Harga)
                const newRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`buy_product_${Date.now()}`)
                            .setLabel('Buy Product')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🛒')
                    );
                
                // Update pesan dengan embed baru dan tombol baru
                await message.edit({
                    embeds: [newEmbed],
                    components: [newRow]
                });
                
                // Konfirmasi ke admin
                await interaction.reply({
                    content: '✅ Harga produk berhasil diperbarui!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat mengatur harga:', error);
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat mengatur harga. Silakan coba lagi.',
                    ephemeral: true
                });
            }
        }
        
        // Menangani form laporan member
        if (interaction.customId === 'member_report_modal') {
            await reportSystem.processMemberReport(interaction, config.reportLogsChannelId);
        }
        
        // Menangani form laporan bug/request
        if (interaction.customId === 'bug_report_modal') {
            await reportSystem.processBugReport(interaction, config.reportLogsChannelId);
        }
        
        // Menangani form jawaban manual
        if (interaction.customId.startsWith('manual_reply_modal_')) {
            await reportSystem.processManualReply(interaction);
        }

        // Menangani form informasi
        if (interaction.customId === 'informasi_modal') {
            await informasiSystem.processInformasiForm(interaction);
        }

        // Menangani form garansi
        if (interaction.customId === 'garansi_modal') {
            await garansiSystem.processGaransiForm(interaction, config.garansiLogsChannelId);
        }

        // Menangani form alasan penolakan klaim garansi
        if (interaction.customId.startsWith('reject_reason_')) {
            const parts = interaction.customId.split('_');
            const claimId = parts[2];
            const userId = parts[3];
            await garansiSystem.processRejectReason(interaction, claimId, userId);
        }

        // Menangani form pesan kontak untuk klaim garansi
        if (interaction.customId.startsWith('contact_message_')) {
            const parts = interaction.customId.split('_');
            const claimId = parts[2];
            const userId = parts[3];
            await garansiSystem.processContactMessage(interaction, claimId, userId);
        }

        // Menangani form testimoni
        if (interaction.customId.startsWith('testimoni_modal_')) {
            await testimoniSystem.processTestimoniForm(interaction, config.testimoniChannelId);
        }
    }
    
    // Menangani interaksi tombol
    if (interaction.isButton()) {
        // Menangani tombol verifikasi
    if (interaction.customId === 'verify_button') {
        try {
            // Mendapatkan role berdasarkan ID
            const role = interaction.guild.roles.cache.get(config.roleId);
            if (!role) return interaction.reply({ content: 'Role tidak ditemukan!', ephemeral: true });
            
            // Memberikan role kepada member
            await interaction.member.roles.add(role);
            
            // Mengirim pesan konfirmasi
            await interaction.reply({ 
                content: '✅ Anda telah diverifikasi dan mendapatkan akses ke server!', 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Terjadi kesalahan saat memberikan role:', error);
            await interaction.reply({ 
                content: '❌ Terjadi kesalahan saat memverifikasi. Silakan hubungi admin.', 
                ephemeral: true 
            });
        }
    }
        
        // Menangani tombol Set Price
        if (interaction.customId.startsWith('set_price_')) {
            try {
                // Memeriksa apakah pengguna memiliki role admin
                const hasAdminRole = interaction.member.roles.cache.has(config.adminRoleId);
                
                if (!hasAdminRole) {
                    return await interaction.reply({
                        content: '❌ Anda tidak memiliki izin untuk mengatur harga produk!',
                        ephemeral: true
                    });
                }
                
                // Membuat modal untuk input harga
                const modal = new ModalBuilder()
                    .setCustomId(`price_modal_${interaction.message.id}`)
                    .setTitle('Atur Harga Produk');
                
                // Membuat input untuk harga
                const harga1Input = new TextInputBuilder()
                    .setCustomId('harga1')
                    .setLabel('HARGA 1')
                    .setPlaceholder('Masukkan harga 1')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                const harga2Input = new TextInputBuilder()
                    .setCustomId('harga2')
                    .setLabel('HARGA 2')
                    .setPlaceholder('Masukkan harga 2')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                
                const harga3Input = new TextInputBuilder()
                    .setCustomId('harga3')
                    .setLabel('HARGA 3')
                    .setPlaceholder('Masukkan harga 3')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                
                const harga4Input = new TextInputBuilder()
                    .setCustomId('harga4')
                    .setLabel('HARGA 4')
                    .setPlaceholder('Masukkan harga 4')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                
                // Menambahkan input ke modal
                const firstActionRow = new ActionRowBuilder().addComponents(harga1Input);
                const secondActionRow = new ActionRowBuilder().addComponents(harga2Input);
                const thirdActionRow = new ActionRowBuilder().addComponents(harga3Input);
                const fourthActionRow = new ActionRowBuilder().addComponents(harga4Input);
                
                modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);
                
                // Menampilkan modal
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Terjadi kesalahan saat menampilkan modal harga:', error);
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat menampilkan form harga. Silakan coba lagi.',
                    ephemeral: true
                });
            }
        }
        
        // Menangani tombol Buy Product
        if (interaction.customId.startsWith('buy_product_')) {
            try {
                // Mendapatkan informasi produk dari pesan
                const message = interaction.message;
                const embed = message.embeds[0];
                
                // Mendapatkan judul produk
                const productTitle = embed.title.replace('🛒 ', '');
                
                // Mendapatkan harga produk (jika ada)
                let productPrices = [];
                let priceLabels = [];
                embed.fields.forEach(field => {
                    if (field.name.startsWith('💰 Harga')) {
                        const priceNumber = field.name.split(' ')[2];
                        const priceValue = field.value;
                        productPrices.push({
                            label: `Harga ${priceNumber}`,
                            value: `price_${priceNumber}_${field.value.replace('Rp ', '')}`,
                            description: field.value
                        });
                        priceLabels.push(field.value);
                    }
                });
                
                // Memeriksa apakah produk sudah memiliki harga
                if (productPrices.length === 0) {
                    return await interaction.reply({
                        content: '❌ Produk ini belum memiliki harga. Silakan tunggu admin mengatur harga terlebih dahulu.',
                        ephemeral: true
                    });
                }
                
                // Simpan informasi dasar pembelian untuk digunakan oleh command /pay
                lastPurchases.set(interaction.channelId, {
                    userId: interaction.user.id,
                    productName: productTitle,
                    hasPriceOptions: true
                });
                
                // Membuat menu pilihan harga
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_price_${interaction.user.id}_${productTitle}_${Date.now()}`)
                    .setPlaceholder('Pilih harga yang Anda inginkan')
                    .addOptions(productPrices);
                
                const selectRow = new ActionRowBuilder()
                    .addComponents(selectMenu);
                
                // Menampilkan menu pilihan harga
                await interaction.reply({
                    content: `Silakan pilih harga untuk produk **${productTitle}**:`,
                    components: [selectRow],
                    ephemeral: true
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat memproses pembelian:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat memproses pembelian. Silakan coba lagi nanti.', 
                    ephemeral: true 
                });
            }
        }
        
        // Menangani tombol Respon dari admin
        if (interaction.customId.startsWith('respond_')) {
            try {
                // Mendapatkan informasi dari customId
                const parts = interaction.customId.split('_');
                const userId = parts[1];
                const productName = parts[2];
                let selectedPriceNumber = '';
                let selectedPriceValue = '';
                
                // Cek jika ada informasi harga yang dipilih
                if (parts.length > 4) {
                    selectedPriceNumber = parts[3];
                    selectedPriceValue = parts[4];
                }
                
                // Mencari user berdasarkan ID
                const user = await interaction.client.users.fetch(userId).catch(() => null);
                if (!user) {
                    return await interaction.reply({ 
                        content: '❌ User tidak ditemukan.', 
                        ephemeral: true 
                    });
                }
                
                // Membuat kategori ticket
                const ticketCategory = await interaction.guild.channels.fetch(config.ticketCategoryId).catch(() => null);
                if (!ticketCategory) {
                    return await interaction.reply({ 
                        content: '❌ Kategori untuk ticket tidak ditemukan.', 
                        ephemeral: true 
                    });
                }
                
                // Membuat channel ticket baru
                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: ticketCategory.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: userId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: interaction.user.id, // Admin yang merespon
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: config.adminRoleId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        }
                    ]
                });
                
                // Mendapatkan informasi produk dari pesan
                const message = interaction.message;
                const embed = message.embeds[0];
                
                // Mendapatkan harga produk yang dipilih
                let productPrice = 'Tidak tersedia';
                if (selectedPriceNumber && selectedPriceValue) {
                    productPrice = `Rp ${selectedPriceValue} (Harga ${selectedPriceNumber})`;
                } else {
                    embed.fields.forEach(field => {
                        if (field.name === '💰 Harga Pilihan') {
                            productPrice = field.value;
                        }
                    });
                }
                
                // Mengirim pesan ke channel ticket dengan format baru
                const ticketEmbed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('🎫 Detail Pesanan')
                    .addFields(
                        { name: '👤 Nama Customer', value: user.username, inline: true },
                        { name: '📦 Produk', value: productName, inline: true },
                        { name: '💰 Harga Pemilihan', value: productPrice, inline: true },
                        { name: '🔢 Jumlah', value: '1', inline: true },
                        { name: '💳 Status Pembayaran', value: '⏳ Menunggu', inline: true },
                        { name: '📝 Instruksi', value: 'Tunggu staff untuk memproses pesanan Anda.', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: `Ticket ID: ${ticketChannel.id}`,
                        iconURL: interaction.guild.iconURL()
                    });
                
                await ticketChannel.send({
                    content: `${user}`,
                    embeds: [ticketEmbed]
                });
                
                // Mengirim pesan ke user
                try {
                    await user.send(`Admin telah membalas Pesanan Anda. Silakan cek channel ${ticketChannel} untuk berkomunikasi lebih lanjut.`);
                } catch (dmError) {
                    console.log('Tidak dapat mengirim DM ke user:', dmError);
                    // Jika tidak bisa mengirim DM, kirim pesan ke channel ticket
                    await ticketChannel.send(`⚠️ Tidak dapat mengirim DM ke ${user}. Mohon beritahu mereka untuk mengecek ticket ini.`);
                }
                
                // Konfirmasi ke admin
                await interaction.reply({ 
                    content: `✅ Ticket telah dibuat di ${ticketChannel} untuk user ${user.username}.`, 
                    ephemeral: true 
                });
                
                // Nonaktifkan tombol respon
                const disabledRow = ActionRowBuilder.from(message.components[0]);
                disabledRow.components[0].setDisabled(true);
                
                await message.edit({
                    embeds: message.embeds,
                    components: [disabledRow]
                });
                
            } catch (error) {
                console.error('Terjadi kesalahan saat membuat ticket:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat membuat ticket. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        }

        // Menangani tombol Konfirmasi Pembayaran
        if (interaction.customId.startsWith('pay_confirm_')) {
            try {
                // Mendapatkan informasi dari customId
                const parts = interaction.customId.split('_');
                const userId = parts[2];
                const productName = parts[3];
                const price = parts[4] !== '0' ? parts[4] : '37000'; // Default harga jika 0
                
                // Membuat ID transaksi unik
                const transactionId = crypto.randomBytes(8).toString('hex').toUpperCase();
                
                // Membuat embed untuk pembayaran QRIS
                const qrisEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Silakan Lakukan Pembayaran via QRISREALTIME')
                    .setDescription('Scan QR Code ini menggunakan aplikasi pembayaran Anda.')
                    .addFields(
                        { name: '📦 Produk', value: productName, inline: true },
                        { name: '💰 Total Belanja', value: `Rp ${price}`, inline: true },
                        { name: '🆔 Order ID', value: transactionId, inline: false }
                    )
                    .setImage(qrisImageUrl)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Biaya admin akan ditambahkan sesuai metode yang dipilih',
                        iconURL: interaction.guild.iconURL()
                    });
                
                // Membuat tombol untuk konfirmasi pembayaran selesai
                const confirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`payment_done_${userId}_${productName}_${price}_${transactionId}`)
                            .setLabel('Pembayaran Selesai')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💰')
                    );
                
                // Membuat embed konfirmasi pembayaran
                const confirmationEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Pembayaran Berhasil!')
                    .setDescription('Admin akan segera memproses pesanan Anda.')
                    .addFields(
                        { name: '📦 Produk', value: productName, inline: true },
                        { name: '💰 Total Pembayaran', value: `Rp ${price}`, inline: true },
                        { name: '🆔 ID Transaksi', value: transactionId, inline: false },
                        { name: '🎭 Role', value: 'Anda telah menerima role member!', inline: false }
                    )
                    .setTimestamp();

                // Tombol testimoni
                const testimoniButton = testimoniSystem.createTestimoniButton();

                // Mengirim konfirmasi pembayaran
                await interaction.update({
                    content: `Terima kasih <@${userId}> atas pembayarannya!`,
                    embeds: [confirmationEmbed],
                    components: [testimoniButton]
                });
                
            } catch (error) {
                console.error('Terjadi kesalahan saat menampilkan QRIS:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat menampilkan QRIS. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        }

        // Menangani tombol Pembayaran Selesai
        if (interaction.customId.startsWith('payment_done_')) {
            try {
                // Mendapatkan informasi dari customId
                const parts = interaction.customId.split('_');
                const userId = parts[2];
                const productName = parts[3];
                const price = parts[4];
                const transactionId = parts[5];
                
                // Mendapatkan member dari userId
                const member = interaction.guild.members.cache.get(userId) || 
                              await interaction.guild.members.fetch(userId).catch(() => null);
                
                if (!member) {
                    return await interaction.reply({
                        content: '❌ Member tidak ditemukan. Transaksi tidak dapat diproses.',
                        ephemeral: true
                    });
                }
                
                // Memberikan role ke member
                try {
                    const role = interaction.guild.roles.cache.get(config.roleId);
                    if (role) {
                        await member.roles.add(role);
                        console.log(`Role ${role.name} berhasil diberikan kepada ${member.user.tag}`);
                    } else {
                        console.error(`Role dengan ID ${config.roleId} tidak ditemukan`);
                    }
                } catch (roleError) {
                    console.error('Error saat memberikan role:', roleError);
                }
                
                // Membuat embed konfirmasi pembayaran
                const confirmationEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Pembayaran Berhasil!')
                    .setDescription('Admin akan segera memproses pesanan Anda.')
                    .addFields(
                        { name: '📦 Produk', value: productName, inline: true },
                        { name: '💰 Total Pembayaran', value: `Rp ${price}`, inline: true },
                        { name: '🆔 ID Transaksi', value: transactionId, inline: false },
                        { name: '🎭 Role', value: 'Anda telah menerima role member!', inline: false }
                    )
                    .setTimestamp();
                
                // Tombol testimoni
                const testimoniButton = testimoniSystem.createTestimoniButton();

                // Mengirim konfirmasi pembayaran
                await interaction.update({
                    content: `Terima kasih <@${userId}> atas pembayarannya!`,
                    embeds: [confirmationEmbed],
                    components: [testimoniButton]
                });
                
                // Mengirim notifikasi ke channel logs
                const logsChannel = await interaction.client.channels.fetch(config.paymentLogsChannelId).catch(() => null);
                if (logsChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('💰 Pembayaran Berhasil')
                        .addFields(
                            { name: '👤 Customer', value: `<@${userId}>`, inline: true },
                            { name: '📦 Produk', value: productName, inline: true },
                            { name: '💰 Jumlah', value: `Rp ${price}`, inline: true },
                            { name: '🆔 ID Transaksi', value: transactionId, inline: false },
                            { name: '🎭 Role', value: 'Role member telah diberikan', inline: false },
                            { name: '⏰ Waktu', value: new Date().toLocaleString(), inline: false }
                        )
                        .setTimestamp();
                    
                    await logsChannel.send({
                        embeds: [logEmbed]
                    });
                }
                
            } catch (error) {
                console.error('Terjadi kesalahan saat konfirmasi pembayaran:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat konfirmasi pembayaran. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        }

        // Menangani tombol Giveaway Join
        if (interaction.customId === 'giveaway_join') {
            try {
                // Cek apakah giveaway dengan ID pesan tersebut ada
                const giveaway = activeGiveaways.get(interaction.message.id);
                if (!giveaway) {
                    return await interaction.reply({
                        content: '❌ Giveaway tidak ditemukan atau sudah berakhir.',
                        ephemeral: true
                    });
                }
                
                // Pastikan participants array ada
                if (!giveaway.participants) {
                    giveaway.participants = [];
                }

                // Cek apakah user sudah bergabung
                const isJoining = !giveaway.participants.includes(interaction.user.id);
                
                if (isJoining) {
                    // User belum bergabung, tambahkan ke giveaway
                    giveaway.participants.push(interaction.user.id);
                    
                    // Update data di Map
                    activeGiveaways.set(interaction.message.id, giveaway);
                    
                    // Update embed untuk menampilkan jumlah peserta
                    const currentEmbed = interaction.message.embeds[0];
                    if (currentEmbed) {
                        try {
                            const updatedEmbed = EmbedBuilder.from(currentEmbed)
                                .setDescription(currentEmbed.description.replace(/\*\*Peserta:\*\* \d+/, `**Peserta:** ${giveaway.participants.length}`));
                            
                            // Tambahkan jumlah peserta jika belum ada
                            if (!currentEmbed.description.includes('**Peserta:**')) {
                                updatedEmbed.setDescription(currentEmbed.description + `\n**Peserta:** ${giveaway.participants.length}`);
                            }
                            
                            await interaction.message.edit({ embeds: [updatedEmbed] });
                        } catch (embedError) {
                            console.error('Error saat memperbarui embed giveaway:', embedError);
                        }
                    }
                    
                    await interaction.reply({
                        content: `✅ Anda telah bergabung dalam giveaway **${giveaway.prize}**! Jumlah peserta saat ini: ${giveaway.participants.length}`,
                        ephemeral: true
                    });
                } else {
                    // User sudah bergabung, hapus dari giveaway
                    giveaway.participants = giveaway.participants.filter(id => id !== interaction.user.id);
                    
                    // Update data di Map
                    activeGiveaways.set(interaction.message.id, giveaway);
                    
                    // Update embed untuk menampilkan jumlah peserta
                    const currentEmbed = interaction.message.embeds[0];
                    if (currentEmbed) {
                        try {
                            const updatedEmbed = EmbedBuilder.from(currentEmbed)
                                .setDescription(currentEmbed.description.replace(/\*\*Peserta:\*\* \d+/, `**Peserta:** ${giveaway.participants.length}`));
                            
                            await interaction.message.edit({ embeds: [updatedEmbed] });
                        } catch (embedError) {
                            console.error('Error saat memperbarui embed giveaway:', embedError);
                    }
                }
                
                    await interaction.reply({
                        content: `❌ Anda telah keluar dari giveaway **${giveaway.prize}**. Jumlah peserta saat ini: ${giveaway.participants.length}`,
                        ephemeral: true
                    });
                }
            } catch (error) {
                console.error('Terjadi kesalahan saat bergabung giveaway:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat bergabung giveaway. Silakan coba lagi.', 
                    ephemeral: true 
                }).catch(() => {});
            }
        }

        // Menangani tombol Giveaway Reroll
        if (interaction.customId.startsWith('giveaway_reroll_')) {
            try {
                const messageId = interaction.customId.split('_')[2];
                const channel = interaction.channel;
                
                // Coba ambil pesan
                const message = await channel.messages.fetch(messageId);
                if (!message) {
                    return await interaction.reply({
                        content: '❌ Pesan giveaway tidak ditemukan.',
                        ephemeral: true
                    });
                }
                
                // Cek apakah ini adalah pesan giveaway yang sudah berakhir
                const embed = message.embeds[0];
                if (!embed || !embed.title || !embed.title.includes('Giveaway Berakhir')) {
                    return await interaction.reply({
                        content: '❌ Pesan ini bukan giveaway yang sudah berakhir.',
                        ephemeral: true
                    });
                }
                
                // Ambil data giveaway dari embed
                const prize = embed.title.replace('🎉 Giveaway Berakhir: ', '');
                
                // Ambil semua peserta dari data yang tersimpan
                const oldGiveaway = Array.from(activeGiveaways.values()).find(g => g.messageId === messageId);
                let participants = [];
                
                if (oldGiveaway && oldGiveaway.participants.length > 0) {
                    participants = [...oldGiveaway.participants];
                } else {
                    // Jika tidak ada data tersimpan, coba ambil dari reaksi
                    const reactions = message.reactions.cache.get('🎉');
                    if (!reactions || reactions.count <= 1) {
                        return await interaction.reply({
                            content: '❌ Tidak ada peserta dalam giveaway ini.',
                            ephemeral: true
                        });
                    }
                    
                    // Ambil semua user yang bereaksi
                    const users = await reactions.users.fetch();
                    participants = users.filter(user => !user.bot).map(user => user.id);
                }
                
                if (participants.length === 0) {
                    return await interaction.reply({
                        content: '❌ Tidak ada peserta dalam giveaway ini.',
                        ephemeral: true
                    });
                }
                
                // Pilih pemenang baru secara acak
                const shuffled = [...participants].sort(() => 0.5 - Math.random());
                const winners = shuffled.slice(0, Math.min(oldGiveaway ? oldGiveaway.winners : 1, shuffled.length));
                
                // Buat daftar pemenang
                const winnersList = winners.map(id => `<@${id}>`).join(', ');
                
                await channel.send({
                    content: `🎉 Pemenang baru untuk giveaway **${prize}** adalah: ${winnersList}!`,
                    allowedMentions: { users: winners }
                });
                
                await interaction.reply({
                    content: `✅ Berhasil memilih pemenang baru untuk giveaway **${prize}**.`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Terjadi kesalahan saat meng-reroll giveaway:', error);
                await interaction.reply({ 
                    content: '❌ Terjadi kesalahan saat meng-reroll giveaway. Silakan coba lagi.', 
                    ephemeral: true 
                });
            }
        }

        // Menangani tombol Close Ticket
        if (interaction.customId.startsWith('close_ticket_')) {
            try {
                // Memeriksa apakah pengguna memiliki role admin
                const hasAdminRole = interaction.member.roles.cache.has(config.adminRoleId);
                
                if (!hasAdminRole) {
                    return await interaction.reply({
                        content: '❌ Hanya admin yang dapat menutup tiket.',
                        ephemeral: true
                    });
                }
                
                // Mendapatkan ID tiket dari customId
                const ticketId = interaction.customId.replace('close_ticket_', '');
                const ticketChannel = interaction.channel;
                
                if (!ticketChannel || ticketChannel.id !== ticketId) {
                    return await interaction.reply({
                        content: '❌ Terjadi kesalahan saat menutup tiket. ID tiket tidak cocok.',
                        ephemeral: true
                    });
                }
                
                // Konfirmasi penutupan tiket
                await interaction.reply({
                    content: '✅ Tiket akan ditutup dalam 5 detik...',
                    ephemeral: true
                });
                
                // Kirim pesan penutupan
                await ticketChannel.send({
                    content: '🔒 Tiket ini ditutup oleh admin. Channel akan dihapus dalam 5 detik...'
                });
                
                // Tunggu 5 detik sebelum menghapus channel
                setTimeout(async () => {
                    try {
                        await ticketChannel.delete('Tiket ditutup oleh admin');
                        console.log(`Tiket ${ticketChannel.name} (${ticketId}) telah ditutup dan dihapus.`);
                    } catch (deleteError) {
                        console.error('Error saat menghapus channel tiket:', deleteError);
                    }
                }, 5000);
            } catch (error) {
                console.error('Terjadi kesalahan saat menutup tiket:', error);
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat menutup tiket. Silakan coba lagi.',
                    ephemeral: true
                }).catch(() => {});
            }
        }

        // Menangani tombol Report
        if (interaction.customId === 'report_button') {
            await reportSystem.showReportOptions(interaction);
        }

        // Menangani tombol Laporkan Member
        if (interaction.customId === 'report_member') {
            await reportSystem.showMemberReportForm(interaction);
        }

        // Menangani tombol Laporkan Bug/Request
        if (interaction.customId === 'report_bug') {
            await reportSystem.showBugReportForm(interaction);
        }

        // Menangani tombol Jawab Laporan
        if (interaction.customId.startsWith('reply_report_')) {
            const userId = interaction.customId.replace('reply_report_', '');
            await reportSystem.showManualReplyForm(interaction, userId);
        }

        // Menangani tombol Jawab Otomatis
        if (interaction.customId.startsWith('auto_reply_')) {
            const userId = interaction.customId.replace('auto_reply_', '');
            await reportSystem.showAutoReplyOptions(interaction, userId);
        }

        // Menangani tombol Claim Garansi
        if (interaction.customId === 'claim_garansi') {
            await garansiSystem.showGaransiForm(interaction);
        }

        // Menangani tombol Setujui Klaim
        if (interaction.customId.startsWith('approve_claim_')) {
            const parts = interaction.customId.split('_');
            const claimId = parts[2];
            const userId = parts[3];
            await garansiSystem.approveGaransiClaim(interaction, claimId, userId);
        }

        // Menangani tombol Tolak Klaim
        if (interaction.customId.startsWith('reject_claim_')) {
            const parts = interaction.customId.split('_');
            const claimId = parts[2];
            const userId = parts[3];
            await garansiSystem.rejectGaransiClaim(interaction, claimId, userId);
        }

        // Menangani tombol Hubungi Pengguna
        if (interaction.customId.startsWith('contact_user_')) {
            const parts = interaction.customId.split('_');
            const claimId = parts[2];
            const userId = parts[3];
            await garansiSystem.showContactUserForm(interaction, claimId, userId);
        }

        // Menangani tombol Testimoni
        if (interaction.customId === 'testimoni_button') {
            // Mendapatkan informasi dari pesan
            const message = interaction.message;
            const embed = message.embeds[0];
            
            // Mendapatkan informasi produk dan harga dari embed
            let productName = 'Produk';
            let price = '0';
            let transactionId = Date.now().toString();
            
            // Coba dapatkan informasi dari embed
            if (embed) {
                const productField = embed.fields.find(field => field.name === '📦 Produk');
                if (productField) {
                    productName = productField.value;
                }
                
                const priceField = embed.fields.find(field => field.name === '💰 Total Pembayaran');
                if (priceField) {
                    price = priceField.value.replace('Rp ', '');
                }
                
                const transactionField = embed.fields.find(field => field.name === '🆔 ID Transaksi');
                if (transactionField) {
                    transactionId = transactionField.value;
                }
            }
            
            // Tampilkan form testimoni
            await testimoniSystem.showTestimoniForm(interaction, productName, price, transactionId);
        }
    }

    // Menangani select menu
    if (interaction.isStringSelectMenu()) {
        // Menangani select menu pilihan harga
        if (interaction.customId.startsWith('select_price_')) {
            try {
                // Mendapatkan informasi dari customId
                const parts = interaction.customId.split('_');
                const userId = parts[2];
                const productTitle = parts[3];
                
                // Mendapatkan nilai harga yang dipilih
                const selectedValue = interaction.values[0];
                const selectedParts = selectedValue.split('_');
                const priceNumber = selectedParts[1];
                const priceValue = selectedParts[2];
                
                // Simpan informasi pembelian untuk digunakan oleh command /pay
                lastPurchases.set(interaction.channelId, {
                    userId: userId,
                    productName: productTitle,
                    price: priceValue,
                    priceLabel: `Harga ${priceNumber}: Rp ${priceValue}`
                });
                
                // Mengirim konfirmasi ke user
                await interaction.update({
                    content: `✅ Anda telah memilih Harga ${priceNumber}: Rp ${priceValue} untuk produk **${productTitle}**.\nKami telah memverifikasi product anda, Mohon menunggu respon admin.`,
                    components: []
                });
                
                // Mengirim log ke channel admin
                const logsChannel = await interaction.client.channels.fetch(config.logsChannelId).catch(() => null);
                if (logsChannel) {
                    // Membuat embed untuk log pembelian
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🛒 Pembelian Produk Baru')
                        .addFields(
                            { name: '👤 Nama Customer', value: interaction.user.username, inline: true },
                            { name: '🆔 ID User', value: interaction.user.id, inline: true },
                            { name: '📦 Produk', value: productTitle, inline: true },
                            { name: '💰 Harga Pilihan', value: `Harga ${priceNumber}: Rp ${priceValue}`, inline: true }
                        )
                        .setTimestamp();
                    
                    // Membuat tombol respon untuk admin
                    const adminRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`respond_${interaction.user.id}_${productTitle}_${priceNumber}_${priceValue}_${Date.now()}`)
                                .setLabel('Respon')
                                .setStyle(ButtonStyle.Success)
                        );
                    
                    // Mengirim log ke channel admin
                    await logsChannel.send({
                        embeds: [logEmbed],
                        components: [adminRow]
                    });
                }
            } catch (error) {
                console.error('Terjadi kesalahan saat memproses pilihan harga:', error);
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat memproses pilihan harga. Silakan coba lagi nanti.',
                    ephemeral: true
                });
            }
        }
        
        // Menangani select menu jawaban otomatis
        if (interaction.customId.startsWith('auto_reply_select_')) {
            await reportSystem.processAutoReply(interaction);
        }
    }
});

// Login bot menggunakan token
client.login(config.token); 