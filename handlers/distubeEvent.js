console.log(`-`.yellow);
const PlayerMap = new Map()
const Discord = require(`discord.js`);
const {
    KSoftClient
} = require('@ksoft/api');
const config = require(`../botconfig/config.json`);
const ksoft = new KSoftClient(config.ksoftapi);
const ee = require(`../botconfig/embed.json`);
const {
  MessageButton,
  MessageActionRow,
  MessageEmbed
} = require(`discord.js`);
const { 
  lyricsEmbed, check_if_dj
} = require("./functions");
let songEditInterval = null;
module.exports = (client) => {
  try {
    client.distube
      .on(`playSong`, async (queue, track) => {
        try {
          client.guilds.cache.get(queue.id).me.voice.setDeaf(true).catch((e) => {
            //console.log(e.stack ? String(e.stack).grey : String(e).grey)
          })
        } catch (error) {
          console.log(error)
        }
        try {
          var newQueue = client.distube.getQueue(queue.id)
          var newTrack = track;
          var data = receiveQueueData(newQueue, newTrack)
          //Send message with buttons
          let currentSongPlayMsg = await queue.textChannel.send(data).then(msg => {
            PlayerMap.set(`currentmsg`, msg.id);
            return msg;
          })
          //create a collector for the thinggy
          var collector = currentSongPlayMsg.createMessageComponentCollector({
            filter: (i) => i.isButton() && i.user && i.message.author.id == client.user.id,
            time: track.duration > 0 ? track.duration * 1000 : 600000
          }); //collector for 5 seconds
          //array of all embeds, here simplified just 10 embeds with numbers 0 - 9
          let lastEdited = false;

          /**
           * @INFORMATION - EDIT THE SONG MESSAGE EVERY 10 SECONDS!
           */
          try{clearInterval(songEditInterval)}catch(e){}
          songEditInterval = setInterval(async () => {
            if (!lastEdited) {
              try{
                var newQueue = client.distube.getQueue(queue.id)
                var newTrack = newQueue.songs[0];
                var data = receiveQueueData(newQueue, newTrack)
                await currentSongPlayMsg.edit(data).catch((e) => {
                  //console.log(e.stack ? String(e.stack).grey : String(e).grey)
                })
              }catch (e){
                clearInterval(songEditInterval)
              }
            }
          }, 10000)

          collector.on('collect', async i => {
            if(i.customId != `10` && check_if_dj(client, i.member, client.distube.getQueue(i.guild.id).songs[0])) {
              return i.reply({embeds: [new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setFooter(ee.footertext, ee.footericon)
                .setTitle(`${client.allEmojis.x} **คุณไม่ใช่ Dj นะ**`)
                .setDescription(`**DJ-ROLES:**\n${check_if_dj(client, i.member, client.distube.getQueue(i.guild.id).songs[0])}`)
              ],
              ephemeral: true});
            }
            lastEdited = true;
            setTimeout(() => {
              lastEdited = false
            }, 7000)
            //skip
            if (i.customId == `1`) {
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **โปรดเข้าห้องเสียงก่อนใช้คำสั่งนะ**`,
                  ephemeral: true
                })
              //get the player instance
              const queue = client.distube.getQueue(i.guild.id);
              //if no player available return aka not playing anything
              if (!queue || !newQueue.songs || newQueue.songs.length == 0) {
                return i.reply({
                  content: `${client.allEmojis.x} หนูไม่ได้ร้องเพลงนะตอนนี้`,
                  ephemeral: true
                })
              }
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องเสียงนี้มาก่อน <#${channel.id}>**`,
                  ephemeral: true
                })
              //if ther is nothing more to skip then stop music and leave the Channel
              if (newQueue.songs.length == 0) {
                //if its on autoplay mode, then do autoplay before leaving...
                  i.reply({
                    embeds: [new MessageEmbed()
                    .setColor(ee.color)
                    .setTimestamp()
                    .setTitle(`⏹ **หยุดร้องเพลงและออกจากห้องแล้วคะ**`)
                    .setFooter(`💢 สั่งงานโดย: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
                  })
                  clearInterval(songEditInterval);
                  //edit the current song message
                  await client.distube.stop(i.guild.id)
                return
              }
              //skip the track
              await client.distube.skip(i.guild.id)
              i.reply({
                embeds: [new MessageEmbed()
                  .setColor(ee.color)
                  .setTimestamp()
                  .setTitle(`⏭ **ข้ามไปเพลงต่อไป**`)
                  .setFooter(`💢 ใช้หนูโดย: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
              })
            }
            //stop
            if (i.customId == `2`) {
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องเสียงก่อนใช้คำสั้งนะคะ**`,
                  ephemeral: true
                })

              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องนี่มานะคะ <#${channel.id}>**`,
                  ephemeral: true
                })
                //stop the track
                i.reply({
                  embeds: [new MessageEmbed()
                    .setColor(ee.color)
                    .setTimestamp()
                    .setTitle(`⏹ **หยุดร้องเพลงและออกจากห้องแล้ว**`)
                    .setFooter(`💢 รับฟังแล้วทำตาม: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
                })
                clearInterval(songEditInterval);
                //edit the current song message
                await client.distube.stop(i.guild.id)
            }
            //pause/resume
            if (i.customId == `3`) {
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องก่อนสิ**`,
                  ephemeral: true
                })
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องที่มัหนูอยู่ก่อน <#${channel.id}>**`,
                  ephemeral: true
                })
              if (newQueue.playing) {
                await client.distube.pause(i.guild.id);
                var data = receiveQueueData(client.distube.getQueue(queue.id), newQueue.songs[0])
                currentSongPlayMsg.edit(data).catch((e) => {
                  //console.log(e.stack ? String(e.stack).grey : String(e).grey)
                })
                i.reply({
                  embeds: [new MessageEmbed()
                    .setColor(ee.color)
                    .setTimestamp()
                    .setTitle(`⏸ **พักการร้องเพลงแล้ว**`)
                    .setFooter(`💢 รับทราบ : ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
                })
              } else {
                //pause the player
                await client.distube.resume(i.guild.id);
                var data = receiveQueueData(client.distube.getQueue(queue.id), newQueue.songs[0])
                currentSongPlayMsg.edit(data).catch((e) => {
                  //console.log(e.stack ? String(e.stack).grey : String(e).grey)
                })
                i.reply({
                  embeds: [new MessageEmbed()
                    .setColor(ee.color)
                    .setTimestamp()
                    .setTitle(`▶️ **ร้องเพลงต่อแล้ว**`)
                    .setFooter(`💢 รับทราบ: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
                })
              }
            }
            //autoplay
            if (i.customId == `4`) {
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **โปรดเข้าห้องเสียงก่อนสิ**`,
                  ephemeral: true
                })
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องนี้สิ <#${channel.id}>**`,
                  ephemeral: true
                })
              //pause the player
              await newQueue.toggleAutoplay()
              if (newQueue.autoplay) {
                var data = receiveQueueData(client.distube.getQueue(queue.id), newQueue.songs[0])
                currentSongPlayMsg.edit(data).catch((e) => {
                  //console.log(e.stack ? String(e.stack).grey : String(e).grey)
                })
              } else {
                var data = receiveQueueData(client.distube.getQueue(queue.id), newQueue.songs[0])
                currentSongPlayMsg.edit(data).catch((e) => {
                  //console.log(e.stack ? String(e.stack).grey : String(e).grey)
                })
              }
              //Send Success Message
              i.reply({
                embeds: [new MessageEmbed()
                  .setColor(ee.color)
                  .setTimestamp()
                  .setTitle(`${newQueue.autoplay ? `${client.allEmojis.check_mark} **เปิดระบบ Autoplay**`: `${client.allEmojis.x} **ปิดระบบ Autoplay**`}`)
                  .setFooter(`💢 สั่งงานโดย: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
                })
            }
            //Shuffle
            if(i.customId == `5`){
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **-**`,
                  ephemeral: true
                })
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **- <#${channel.id}>**`,
                  ephemeral: true
                })
              //pause the player
              await newQueue.shuffle()
              //Send Success Message
              i.reply({
                embeds: [new MessageEmbed()
                  .setColor(ee.color)
                  .setTimestamp()
                  .setTitle(`-`)
                  .setFooter(`💢 ใช้งาน: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
              })
            }
            //Songloop
            if(i.customId == `6`){
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องเสียงก่อนสิ**`,
                  ephemeral: true
                })
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องนี้ <#${channel.id}> ก่อนนะ**`,
                  ephemeral: true
                })
              //Disable the Repeatmode
              if(newQueue.repeatMode == 1){
                await newQueue.setRepeatMode(0)
              } 
              //Enable it
              else {
                await newQueue.setRepeatMode(1)
              }
              i.reply({
                embeds: [new MessageEmbed()
                  .setColor(ee.color)
                  .setTimestamp()
                  .setTitle(`${newQueue.repeatMode == 1 ? `${client.allEmojis.check_mark} **เปิดระบบ Song-Loop**`: `${client.allEmojis.x} **ปิดระบบ Song-Loop**`}`)
                  .setFooter(`💢 สั่งงานโดย: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
              })
              var data = receiveQueueData(client.distube.getQueue(queue.id), newQueue.songs[0])
              currentSongPlayMsg.edit(data).catch((e) => {
                //console.log(e.stack ? String(e.stack).grey : String(e).grey)
              })
            }
            //Queueloop
            if(i.customId == `7`){
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **โปรดเข้าเสียงก่อนนะขอร้อง**`,
                  ephemeral: true
                })
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้อง <#${channel.id}> ก่อนนะ**`,
                  ephemeral: true
                })
              //Disable the Repeatmode
              if(newQueue.repeatMode == 2){
                await newQueue.setRepeatMode(0)
              } 
              //Enable it
              else {
                await newQueue.setRepeatMode(2)
              }
              i.reply({
                embeds: [new MessageEmbed()
                  .setColor(ee.color)
                  .setTimestamp()
                  .setTitle(`${newQueue.repeatMode == 2 ? `${client.allEmojis.check_mark} **เปิดระบบ Queue-Loop**`: `${client.allEmojis.x} **ปิดระบบ Queue-Loop**`}`)
                  .setFooter(`💢 ใช้งานโดย: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
                })
              var data = receiveQueueData(client.distube.getQueue(queue.id), newQueue.songs[0])
              currentSongPlayMsg.edit(data).catch((e) => {
                //console.log(e.stack ? String(e.stack).grey : String(e).grey)
              })
            }
            //Forward
            if(i.customId == `8`){
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **ไม่อยู่ในห้องเสียงอ่ะ**`,
                  ephemeral: true
                })
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้ามาอยู่กับหนูก่อนสิในห้อง <#${channel.id}>**`,
                  ephemeral: true
                })
              let seektime = newQueue.currentTime + 10;
              if (seektime >= newQueue.songs[0].duration) seektime = newQueue.songs[0].duration - 1;
              await newQueue.seek(Number(seektime))
              collector.resetTimer({time: (newQueue.songs[0].duration - newQueue.currentTime) * 1000})
              i.reply({
                embeds: [new MessageEmbed()
                  .setColor(ee.color)
                  .setTimestamp()
                  .setTitle(`⏩ **ย้อนเวลา \`10 Seconds\`!**`)
                  .setFooter(`💢 ใช้งานโดย: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
              })
              var data = receiveQueueData(client.distube.getQueue(queue.id), newQueue.songs[0])
              currentSongPlayMsg.edit(data).catch((e) => {
                //console.log(e.stack ? String(e.stack).grey : String(e).grey)
              })
            }
            //Rewind
            if(i.customId == `9`){
              let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องเสียงก่อน**`,
                  ephemeral: true
                })
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้ามาในนี้สิ <#${channel.id}>**`,
                  ephemeral: true
                })
              let seektime = newQueue.currentTime - 10;
              if (seektime < 0) seektime = 0;
              if (seektime >= newQueue.songs[0].duration - newQueue.currentTime) seektime = 0;
              await newQueue.seek(Number(seektime))
              collector.resetTimer({time: (newQueue.songs[0].duration - newQueue.currentTime) * 1000})
              i.reply({
                embeds: [new MessageEmbed()
                  .setColor(ee.color)
                  .setTimestamp()
                  .setTitle(`⏪ **ย้อนกลับเพลง \`10 Seconds\`!**`)
                  .setFooter(`💢 โดย: ${member.user.tag}`, member.user.displayAvatarURL({dynamic: true}))]
              })
              var data = receiveQueueData(client.distube.getQueue(queue.id), newQueue.songs[0])
              currentSongPlayMsg.edit(data).catch((e) => {
                //console.log(e.stack ? String(e.stack).grey : String(e).grey)
              })
            }
            //Lyrics
            if(i.customId == `10`){let { member } = i;
              //get the channel instance from the Member
              const { channel } = member.voice
              //if the member is not in a channel, return
              if (!channel)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้าห้องเสียงก่อนสิจ๊ะ**`,
                  ephemeral: true
                })
              //if not in the same channel as the player, return Error
              if (channel.id !== newQueue.voiceChannel.id)
                return i.reply({
                  content: `${client.allEmojis.x} **เข้ามาใน <#${channel.id}> นี้ก่อนนะ**`,
                  ephemeral: true
                })
                return i.reply({
                  content: `${client.allEmojis.x} **Lyrics ถูกปิดถาวร**\n> *ขอโทษนะแต่เรามีปัญหากับ youtube ทำให้ระบบนี้ใช้ไม่ได้* :cry:`,
                  ephemeral: true
                });
              let embeds = [];
              await ksoft.lyrics.get(newQueue.songs[0].name).then(
                async track => {
                    if (!track.lyrics) return i.reply({content: `${client.allEmojis.x} **ไม่มี Lyrics** :cry:`, ephemeral: true});
                    lyrics = track.lyrics;
                embeds = lyricsEmbed(lyrics, newQueue.songs[0]);
              }).catch(e=>{
                console.log(e)
                return i.reply({content: `${client.allEmojis.x} **ไม่มี Lyrics** :cry:\n${String(e).substr(0, 1800)}`, ephemeral: true});
              })
              i.reply({
                embeds: embeds, ephemeral: true
              })
            }
          });
        } catch (error) {
          console.error(error)
        }
      })
      .on(`เพื่อเพลง`, (queue, song) => queue.textChannel.send({
        embeds: [
          new MessageEmbed()
          .setColor(ee.color)
          .setThumbnail(`https://img.youtube.com/vi/${song.id}/mqdefault.jpg`)
          .setFooter("💯 " + song.user.tag, song.user.displayAvatarURL({
            dynamic: true
          }))
          .setTitle(`${client.allEmojis.check_mark} **เพิ่มเพลงเข้าสู่ระบบแล้ว**`)
          .setDescription(`👍 เพลง: [\`${song.name}\`](${song.url})  -  \`${song.formattedDuration}\``)
          .addField(`⌛ **เวลาในการเล่นทั้งหมด:**`, `\`${queue.songs.length - 1} เพลง${queue.songs.length > 0 ? "s" : ""}\` - \`${(Math.floor((queue.duration - song.duration) / 60 * 100) / 100).toString().replace(".", ":")}\``)
          .addField(`🌀 **เพลงทั้งหมด:**`, `\`${queue.formattedDuration}\``)
        ]
      }))
      .on(`เพื่มเข้าสู่ระบบแล้ว`, (queue, playlist) => queue.textChannel.send({
        embeds: [
          new MessageEmbed()
          .setColor(ee.color)
          .setThumbnail(playlist.thumbnail.url ? playlist.thumbnail.url : `https://img.youtube.com/vi/${playlist.songs[0].id}/mqdefault.jpg`)
          .setFooter("💯" + playlist.user.tag, playlist.user.displayAvatarURL({
            dynamic: true
          }))
          .setTitle(`${client.allEmojis.check_mark} **Playlist ถูกเพิ่มแล้ว**`)
          .setDescription(`👍 Playlist: [\`${playlist.name}\`](${playlist.url ? playlist.url : ""})  -  \`${playlist.songs.length} Song${playlist.songs.length > 0 ? "s" : ""}\``)
          .addField(`⌛ **เวลาในการเล่นทั้งหมด:**`, `\`${queue.songs.length - - playlist.songs.length} song${queue.songs.length > 0 ? "s" : ""}\` - \`${(Math.floor((queue.duration - playlist.duration) / 60 * 100) / 100).toString().replace(".", ":")}\``)
          .addField(`🌀 **เพลงทั้งหมด:**`, `\`${queue.formattedDuration}\``)
        ]
      }))
       //DisTubeOptions.searchSongs = true
      .on(`ผลการค้นหา`, (message, result) => {
        let i = 0
        message.channel.send(`**เลือกตัวเลือกจากด้านล่าง**\n${result.map((song) => `**${++i}**. ${song.name} - \`${song.formattedDuration}\``).join(`\n`)}\n*ป้อนอย่างอื่นหรือรอ 60 วินาทีเพื่อยกเลิก*`)
      })
       //DisTubeOptions.searchSongs = true
      .on(`การค้นหาถูกยกเลิก`, message => message.channel.send(`Searching canceled`).catch((e)=>console.log(e)))
      .on(`error`, (channel, e) => {
        channel.send(`An error encountered: ${e}`).catch((e)=>console.log(e))
        console.error(e)
      })
      .on(`empty`, channel => channel.send(`....ห้องไม่มีคนอยู่อะ หนูไปล่ะ`).catch((e)=>console.log(e)))
      .on(`searchNoResult`, message => message.channel.send(`ค้นหาไม่เจอ!`).catch((e)=>console.log(e)))
      .on(`finishSong`, (queue, song) => {
        var embed = new MessageEmbed().setColor(ee.color)
        .setAuthor(`${song.name}`, "https://c.tenor.com/vgH7rtApnPUAAAAM/jinx-flipzflops.gif", song.url)
        .setDescription(`-`)
        .setThumbnail(`https://img.youtube.com/vi/${song.id}/mqdefault.jpg`)
        .setFooter(`💯 ${song.user.tag}\n⛔️ เพลงจบแล้ว`, song.user.displayAvatarURL({
          dynamic: true
        }));
        queue.textChannel.messages.fetch(PlayerMap.get(`currentmsg`)).then(currentSongPlayMsg=>{
          currentSongPlayMsg.edit({embeds: [embed], components: []}).catch((e) => {
            //console.log(e.stack ? String(e.stack).grey : String(e).grey)
          })
        }).catch((e) => {
          //console.log(e.stack ? String(e.stack).grey : String(e).grey)
        })
      })
      .on(`finish`, queue => {
        queue.textChannel.send({
          embeds: [
            new MessageEmbed().setColor(ee.color).setFooter(ee.footertext, ee.footericon)
            .setTitle("⛔️ ออกจากห้องแล้วนะ")
            .setDescription(":headphones: **ไม่มีเพลงเล่นต่อแล้ว**")
            .setTimestamp()
          ]
        })
      })
      .on(`initQueue`, queue => {
        try {
          client.settings.ensure(queue.id, {
            defaultvolume: 50,
            defaultautoplay: false,
            defaultfilters: [`bassboost6`, `clear`]
          })
          let data = client.settings.get(queue.id)
          queue.autoplay = Boolean(data.defaultautoplay);
          queue.volume = Number(data.defaultvolume);
          queue.setFilter(data.defaultfilters);
        } catch (error) {
          console.error(error)
        }
      });
  } catch (e) {
    console.log(String(e.stack).bgRed)
  }

  function receiveQueueData(newQueue, newTrack) {
    var djs = client.settings.get(newQueue.id, `djroles`);
    if(!djs || !Array.isArray(djs)) djs = [];
    else djs = djs.map(r => `<@&${r}>`);
    if(djs.length == 0 ) djs = "`ไม่ได้ตั้งค่า`";
    else djs.slice(0, 15).join(", ");
    if(!newTrack) return new MessageEmbed().setColor(ee.wrongcolor).setTitle("ไม่รู้จักเพลง?!?!")
    var embed = new MessageEmbed().setColor(ee.color)
      .setDescription(`เข้าไปดู list เพลงผ่าน [ **DASHBOARD** Live!](${require("../dashboard/settings.json").website.domain}/queue/${newQueue.id})`)
      .addField(`💡 ใช้งานโดย:`, `>>> ${newTrack.user}`, true)
      .addField(`⏱ เวลาการเล่น:`, `>>> \`${newQueue.formattedCurrentTime} / ${newTrack.formattedDuration}\``, true)
      .addField(`🌀 คิว:`, `>>> \`${newQueue.songs.length} song(s)\`\n\`${newQueue.formattedDuration}\``, true)
      .addField(`🔊 ระดับเสียง:`, `>>> \`${newQueue.volume} %\``, true)
      .addField(`♾ Loop:`, `>>> ${newQueue.repeatMode ? newQueue.repeatMode === 2 ? `${client.allEmojis.check_mark}\` Queue\`` : `${client.allEmojis.check_mark} \`Song\`` : `${client.allEmojis.x}`}`, true)
      .addField(`↪️ ระบบ Autoplay:`, `>>> ${newQueue.autoplay ? `${client.allEmojis.check_mark}` : `${client.allEmojis.x}`}`, true)
      .addField(`❔ โหลดเพลง:`, `>>> [\`Click here\`](${newTrack.streamURL})`, true)
      .addField(`❔ Filter${newQueue.filters.length > 0 ? "s": ""}:`, `>>> ${newQueue.filters && newQueue.filters.length > 0 ? `${newQueue.filters.map(f=>`\`${f}\``).join(`, `)}` : `${client.allEmojis.x}`}`, newQueue.filters.length > 1 ? false : true)
			.addField(`🎧 DJ-Role${client.settings.get(newQueue.id, "djroles").length > 1 ? "s": ""}:`, `>>> ${djs}`, client.settings.get(newQueue.id, "djroles").length > 1 ? false : true)
      .setAuthor(`${newTrack.name}`, `https://images-ext-1.discordapp.net/external/DkPCBVBHBDJC8xHHCF2G7-rJXnTwj_qs78udThL8Cy0/%3Fv%3D1/https/cdn.discordapp.com/emojis/859459305152708630.gif`, newTrack.url)
      .setThumbnail(`https://img.youtube.com/vi/${newTrack.id}/mqdefault.jpg`)
      .setFooter(`💯 ${newTrack.user.tag}`, newTrack.user.displayAvatarURL({
        dynamic: true
      }));
    let skip = new MessageButton().setStyle('PRIMARY').setCustomId('1').setEmoji(`⏭`).setLabel(`เพลงต่อไป`)
    let stop = new MessageButton().setStyle('DANGER').setCustomId('2').setEmoji(`🏠`).setLabel(`ปิดเพลง`)
    let pause = new MessageButton().setStyle('SECONDARY').setCustomId('3').setEmoji('⏸').setLabel(`หยุดเพลง`)
    let autoplay = new MessageButton().setStyle('SUCCESS').setCustomId('4').setEmoji('🔁').setLabel(`Autoplay`)
    let shuffle = new MessageButton().setStyle('PRIMARY').setCustomId('5').setEmoji('🔀').setLabel(`Shuffle`)
    if (!newQueue.playing) {
      pause = pause.setStyle('SUCCESS').setEmoji('▶️').setLabel(`Resume`)
    }
    if (newQueue.autoplay) {
      autoplay = autoplay.setStyle('SECONDARY')
    }
    let songloop = new MessageButton().setStyle('SUCCESS').setCustomId('6').setEmoji(`🔁`).setLabel(`Song`)
    let queueloop = new MessageButton().setStyle('SUCCESS').setCustomId('7').setEmoji(`🔂`).setLabel(`Queue`)
    let forward = new MessageButton().setStyle('PRIMARY').setCustomId('8').setEmoji('⏩').setLabel(`+10 Sec`)
    let rewind = new MessageButton().setStyle('PRIMARY').setCustomId('9').setEmoji('⏪').setLabel(`-10 Sec`)
    let lyrics = new MessageButton().setStyle('PRIMARY').setCustomId('10').setEmoji('📝').setLabel(`Lyrics`).setDisabled();
    if (newQueue.repeatMode === 0) {
      songloop = songloop.setStyle('SUCCESS')
      queueloop = queueloop.setStyle('SUCCESS')
    }
    if (newQueue.repeatMode === 1) {
      songloop = songloop.setStyle('SECONDARY')
      queueloop = queueloop.setStyle('SUCCESS')
    }
    if (newQueue.repeatMode === 2) {
      songloop = songloop.setStyle('SUCCESS')
      queueloop = queueloop.setStyle('SECONDARY')
    }
    if (Math.floor(newQueue.currentTime) < 10) {
      rewind = rewind.setDisabled()
    } else {
      rewind = rewind.setDisabled(false)
    }
    if (Math.floor((newTrack.duration - newQueue.currentTime)) <= 10) {
      forward = forward.setDisabled()
    } else {
      forward = forward.setDisabled(false)
    }
    const row = new MessageActionRow().addComponents([skip, stop, pause, autoplay, shuffle]);
    const row2 = new MessageActionRow().addComponents([songloop, queueloop, forward, rewind, lyrics]);
    return {
      embeds: [embed],
      components: [row, row2]
    };
  }
};

