import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { classService } from '@/services/classService';
import { useP2Classes } from '@/hooks/useP2Data';
import { useSiprakContext } from '@/context/SiprakContext';

export default function KelolaKelasScreen() {
  const { currentUser } = useSiprakContext();
  const { classes, loading, error } = useP2Classes();
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [praktikum, setPraktikum] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const save = async () => {
    if (!currentUser || busy) return;
    setBusy(true);
    try { if (editingId) { await classService.updateClass(editingId, { nama, kode, namaPraktikum: praktikum }); setEditingId(null); } else { await classService.createClass({ nama, kode, namaPraktikum: praktikum }, currentUser.id); } setNama(''); setKode(''); setPraktikum(''); }
    catch (e) { Alert.alert('Gagal menyimpan', e instanceof Error ? e.message : 'Terjadi kesalahan.'); }
    finally { setBusy(false); }
  };
  const archive = (id: string) => Alert.alert('Arsipkan kelas?', 'Kelas tidak dihapus permanen agar riwayat tetap terjaga.', [
    { text: 'Batal', style: 'cancel' }, { text: 'Arsipkan', style: 'destructive', onPress: async () => {
      try { await classService.archiveClass(id); } catch (e) { Alert.alert('Gagal', e instanceof Error ? e.message : 'Tidak dapat mengarsipkan kelas.'); }
    } },
  ]);
  return <View style={s.container}>
    <Text style={s.title}>Kelola kelas</Text><Text style={s.sub}>Kelas yang ditugaskan ke akun asisten ini.</Text>
    <TextInput style={s.input} placeholder="Nama kelas (contoh: Kelas A)" value={nama} onChangeText={setNama}/>
    <TextInput style={s.input} placeholder="Kode kelas" value={kode} onChangeText={setKode} autoCapitalize="characters"/>
    <TextInput style={s.input} placeholder="Nama praktikum" value={praktikum} onChangeText={setPraktikum}/>
    <Pressable style={[s.primary,busy&&s.disabled]} onPress={save} disabled={busy}><Text style={s.primaryText}>{busy?'Menyimpan…':editingId?'Simpan perubahan':'Tambah kelas'}</Text></Pressable>
    {loading ? <Text style={s.info}>Memuat kelas…</Text> : null}
    {error ? <Text style={s.error}>{error}</Text> : null}
    <FlatList data={classes} keyExtractor={x=>x.id} ListEmptyComponent={!loading?<Text style={s.info}>Belum ada kelas. Tambahkan kelas pertama.</Text>:null}
      renderItem={({item})=><View style={s.card}><View style={{flex:1}}><Text style={s.cardTitle}>{item.nama} · {item.kode}</Text><Text style={s.sub}>{item.namaPraktikum}</Text><Text style={s.muted}>ID: {item.id}</Text></View><View style={{gap:10}}><Pressable onPress={()=>{setEditingId(item.id);setNama(item.nama);setKode(item.kode);setPraktikum(item.namaPraktikum);}}><Text style={{color:'#315CCB',fontWeight:'700'}}>Edit</Text></Pressable><Pressable onPress={()=>archive(item.id)}><Text style={s.danger}>Arsip</Text></Pressable></View></View>}/>
  </View>;
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:'#F5F7FB',padding:18},title:{fontSize:24,fontWeight:'800',color:'#17243B'},sub:{color:'#65738A',marginTop:5,marginBottom:12},input:{backgroundColor:'#fff',borderColor:'#DCE3EC',borderWidth:1,borderRadius:10,padding:12,marginBottom:9,color:'#17243B'},primary:{backgroundColor:'#315CCB',padding:13,borderRadius:10,alignItems:'center',marginBottom:16},disabled:{opacity:.6},primaryText:{color:'#fff',fontWeight:'700'},info:{color:'#65738A',padding:12},error:{color:'#B42318',padding:8},card:{backgroundColor:'#fff',borderRadius:12,padding:14,marginBottom:9,flexDirection:'row',alignItems:'center'},cardTitle:{fontWeight:'700',color:'#17243B'},muted:{fontSize:11,color:'#8290A3',marginTop:4},danger:{color:'#B42318',fontWeight:'700'}});
