import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { classService } from '@/services/classService';
import { useP2Classes, useP2Members } from '@/hooks/useP2Data';

export default function KelolaPesertaScreen() {
  const params = useLocalSearchParams<{ classId?: string }>();
  const { classes } = useP2Classes();
  const [selected, setSelected] = useState(params.classId ?? '');
  const [uid, setUid] = useState('');
  const [busy, setBusy] = useState(false);
  const activeClass = classes.find(c=>c.id===selected) ?? null;
  const { members, loading, error } = useP2Members(activeClass?.id ?? null);
  const add = async () => {
    if (!activeClass || busy) return;
    setBusy(true);
    try { await classService.addMember(activeClass.id, uid); setUid(''); Alert.alert('Berhasil','Praktikan ditambahkan ke kelas.'); }
    catch(e) { Alert.alert('Gagal menambahkan',e instanceof Error?e.message:'Terjadi kesalahan.'); }
    finally { setBusy(false); }
  };
  const remove = (memberUid:string) => Alert.alert('Keluarkan peserta?', 'Riwayat presensi tidak akan dihapus.',[
    {text:'Batal',style:'cancel'},{text:'Keluarkan',style:'destructive',onPress:async()=>{try{await classService.removeMember(activeClass!.id,memberUid);}catch(e){Alert.alert('Gagal',e instanceof Error?e.message:'Terjadi kesalahan.');}}}
  ]);
  return <View style={s.container}>
    <Text style={s.title}>Kelola peserta kelas</Text>
    <Text style={s.sub}>Pilih kelas, lalu masukkan UID Firebase akun praktikan yang sudah terdaftar.</Text>
    <View style={s.choices}>{classes.map(c=><Pressable key={c.id} onPress={()=>setSelected(c.id)} style={[s.choice,selected===c.id&&s.choiceOn]}><Text style={[s.choiceText,selected===c.id&&s.choiceTextOn]}>{c.nama}</Text></Pressable>)}</View>
    {activeClass ? <>
      <TextInput style={s.input} placeholder="UID Firebase praktikan" value={uid} onChangeText={setUid} autoCapitalize="none"/>
      <Pressable style={s.primary} onPress={add} disabled={busy}><Text style={s.primaryText}>{busy?'Memproses…':'Tambahkan peserta'}</Text></Pressable>
      <Text style={s.section}>Daftar peserta aktif</Text>
      {loading?<Text style={s.info}>Memuat peserta…</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}
      <FlatList data={members.filter(m=>m.active)} keyExtractor={m=>m.uid} ListEmptyComponent={!loading?<Text style={s.info}>Belum ada peserta terdaftar.</Text>:null}
        renderItem={({item})=><View style={s.card}><View style={{flex:1}}><Text style={s.cardTitle}>{item.namaSnapshot}</Text><Text style={s.muted}>UID: {item.uid}</Text>{item.nimSnapshot?<Text style={s.muted}>NIM: {item.nimSnapshot}</Text>:null}</View><Pressable onPress={()=>remove(item.uid)}><Text style={s.danger}>Keluarkan</Text></Pressable></View>}/>
    </>:<Text style={s.info}>Buat kelas terlebih dahulu.</Text>}
  </View>;
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:'#F5F7FB',padding:18},title:{fontSize:24,fontWeight:'800',color:'#17243B'},sub:{color:'#65738A',marginVertical:10},choices:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12},choice:{borderWidth:1,borderColor:'#DCE3EC',padding:10,borderRadius:20},choiceOn:{backgroundColor:'#315CCB',borderColor:'#315CCB'},choiceText:{color:'#526074'},choiceTextOn:{color:'#fff'},input:{backgroundColor:'#fff',borderColor:'#DCE3EC',borderWidth:1,borderRadius:10,padding:12,marginBottom:9},primary:{backgroundColor:'#315CCB',padding:13,borderRadius:10,alignItems:'center'},primaryText:{color:'#fff',fontWeight:'700'},section:{fontWeight:'800',fontSize:17,color:'#17243B',marginTop:20,marginBottom:8},info:{color:'#65738A',padding:12},error:{color:'#B42318'},card:{backgroundColor:'#fff',borderRadius:12,padding:14,marginBottom:9,flexDirection:'row',alignItems:'center'},cardTitle:{fontWeight:'700',color:'#17243B'},muted:{fontSize:11,color:'#8290A3',marginTop:4},danger:{color:'#B42318',fontWeight:'700'}});
