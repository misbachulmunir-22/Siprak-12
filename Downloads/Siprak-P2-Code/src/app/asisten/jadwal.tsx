import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { scheduleService } from '@/services/scheduleService';
import { useP2Schedules } from '@/hooks/useP2Data';
import { useSiprakContext } from '@/context/SiprakContext';
import type { Kelas } from '@/types/siprak';

export default function KelolaJadwalScreen() {
  const { currentUser } = useSiprakContext();
  const { classes, schedules, sessions, loading, error } = useP2Schedules();
  const [classId,setClassId]=useState('');
  const [praktikum,setPraktikum]=useState('');
  const [pertemuan,setPertemuan]=useState('1');
  const [lab,setLab]=useState('');
  const [tanggal,setTanggal]=useState('');
  const [mulai,setMulai]=useState('');
  const [selesai,setSelesai]=useState('');
  const [busy,setBusy]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const selectedClass:Kelas|undefined=classes.find(c=>c.id===classId);
  const create=async()=>{
    if(!currentUser||!selectedClass||busy)return;
    setBusy(true);
    try{
      const input={classId,namaPraktikum:praktikum||selectedClass.namaPraktikum,pertemuan:Number(pertemuan),lab,tanggal,jamMulai:mulai,jamSelesai:selesai,active:true};
      if(editingId){const oldSession=sessions.find(x=>x.scheduleId===editingId);if(!oldSession)throw new Error('Sesi terkait tidak ditemukan.');await scheduleService.updateSchedule(editingId,oldSession.id,input,selectedClass);setEditingId(null);}else{await scheduleService.createSchedule(input,currentUser.id,selectedClass);}
      setPraktikum('');setPertemuan(String(Number(pertemuan)+1));setLab('');setTanggal('');setMulai('');setSelesai('');
      Alert.alert('Berhasil','Jadwal dan dokumen sesi berhasil dibuat.');
    }catch(e){Alert.alert('Gagal menyimpan',e instanceof Error?e.message:'Terjadi kesalahan.');}
    finally{setBusy(false);}
  };
  const archive=(scheduleId:string)=>{
    const session=sessions.find(s=>s.scheduleId===scheduleId);
    Alert.alert('Arsipkan jadwal?','Jadwal dan sesi akan dinonaktifkan, bukan dihapus permanen.',[
      {text:'Batal',style:'cancel'},{text:'Arsipkan',style:'destructive',onPress:async()=>{
        if(!session)return;
        try{await scheduleService.archiveSchedule(scheduleId,session.id);}catch(e){Alert.alert('Gagal',e instanceof Error?e.message:'Tidak dapat mengarsipkan.');}
      }}
    ]);
  };
  return <View style={s.container}>
    <Text style={s.title}>Kelola jadwal & sesi</Text><Text style={s.sub}>Membuat jadwal juga membuat satu dokumen sesi awal berstatus belum_dibuka untuk digunakan P3.</Text>
    <Text style={s.label}>Kelas</Text><View style={s.choices}>{classes.map(c=><Pressable key={c.id} onPress={()=>setClassId(c.id)} style={[s.choice,classId===c.id&&s.choiceOn]}><Text style={[s.choiceText,classId===c.id&&s.choiceTextOn]}>{c.nama}</Text></Pressable>)}</View>
    <TextInput style={s.input} placeholder="Nama praktikum (opsional)" value={praktikum} onChangeText={setPraktikum}/>
    <TextInput style={s.input} placeholder="Nomor pertemuan" keyboardType="number-pad" value={pertemuan} onChangeText={setPertemuan}/>
    <TextInput style={s.input} placeholder="Lokasi / Lab" value={lab} onChangeText={setLab}/>
    <TextInput style={s.input} placeholder="Tanggal YYYY-MM-DD" value={tanggal} onChangeText={setTanggal}/>
    <View style={s.row}><TextInput style={[s.input,s.half]} placeholder="Mulai HH:MM" value={mulai} onChangeText={setMulai}/><TextInput style={[s.input,s.half]} placeholder="Selesai HH:MM" value={selesai} onChangeText={setSelesai}/></View>
    <Pressable style={s.primary} onPress={create} disabled={busy}><Text style={s.primaryText}>{busy?'Menyimpan…':'Buat jadwal & sesi'}</Text></Pressable>
    {loading?<Text style={s.info}>Memuat jadwal…</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}
    <Text style={s.section}>Jadwal tersimpan</Text>
    <FlatList data={schedules} keyExtractor={x=>x.id} ListEmptyComponent={!loading?<Text style={s.info}>Belum ada jadwal.</Text>:null}
      renderItem={({item})=><View style={s.card}><View style={{flex:1}}><Text style={s.cardTitle}>{item.namaPraktikum} · Pertemuan {item.pertemuan}</Text><Text style={s.sub}>{classes.find(c=>c.id===item.classId)?.nama??'Kelas'} · {item.tanggal} · {item.jamMulai}-{item.jamSelesai}</Text><Text style={s.muted}>{item.lab} · Sesi: {sessions.find(x=>x.scheduleId===item.id)?.status??'menunggu sinkronisasi'}</Text></View><View style={{gap:8}}><Pressable onPress={()=>{const sess=sessions.find(x=>x.scheduleId===item.id);if(!sess){Alert.alert('Tidak dapat mengedit','Sesi terkait belum tersedia.');return;}setEditingId(item.id);setClassId(item.classId);setPraktikum(item.namaPraktikum);setPertemuan(String(item.pertemuan));setLab(item.lab);setTanggal(item.tanggal);setMulai(item.jamMulai);setSelesai(item.jamSelesai);}}><Text style={{color:'#315CCB',fontWeight:'700'}}>Edit</Text></Pressable><Pressable onPress={()=>archive(item.id)}><Text style={s.danger}>Arsip</Text></Pressable></View></View>}/>
  </View>;
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:'#F5F7FB',padding:18},title:{fontSize:24,fontWeight:'800',color:'#17243B'},sub:{color:'#65738A',marginVertical:5},label:{fontWeight:'700',color:'#17243B',marginTop:8},choices:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8},choice:{borderWidth:1,borderColor:'#DCE3EC',padding:9,borderRadius:20},choiceOn:{backgroundColor:'#315CCB',borderColor:'#315CCB'},choiceText:{color:'#526074'},choiceTextOn:{color:'#fff'},input:{backgroundColor:'#fff',borderColor:'#DCE3EC',borderWidth:1,borderRadius:10,padding:11,marginBottom:8,flex:1},row:{flexDirection:'row',gap:8},half:{minWidth:0},primary:{backgroundColor:'#315CCB',padding:13,borderRadius:10,alignItems:'center'},primaryText:{color:'#fff',fontWeight:'700'},info:{color:'#65738A',padding:12},error:{color:'#B42318'},section:{fontWeight:'800',fontSize:17,color:'#17243B',marginTop:18,marginBottom:8},card:{backgroundColor:'#fff',borderRadius:12,padding:14,marginBottom:9,flexDirection:'row',alignItems:'center'},cardTitle:{fontWeight:'700',color:'#17243B'},muted:{fontSize:11,color:'#8290A3'},danger:{color:'#B42318',fontWeight:'700'}});
