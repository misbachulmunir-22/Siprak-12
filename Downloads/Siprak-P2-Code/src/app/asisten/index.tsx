import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import JadwalList from '@/components/JadwalList';

export default function AsistenJadwalScreen() {
  return <View style={{flex:1,backgroundColor:'#F5F7FB'}}>
    <View style={s.actions}>
      <Pressable style={s.button} onPress={()=>router.push('/asisten/kelas')}><Text style={s.buttonText}>Kelola kelas</Text></Pressable>
      <Pressable style={s.button} onPress={()=>router.push('/asisten/peserta')}><Text style={s.buttonText}>Kelola peserta</Text></Pressable>
      <Pressable style={s.button} onPress={()=>router.push('/asisten/jadwal')}><Text style={s.buttonText}>Kelola jadwal</Text></Pressable>
    </View>
    <View style={{flex:1}}><JadwalList/></View>
  </View>;
}
const s=StyleSheet.create({actions:{flexDirection:'row',flexWrap:'wrap',gap:7,paddingHorizontal:14,paddingTop:12},button:{backgroundColor:'#E8EEFF',borderRadius:9,paddingHorizontal:12,paddingVertical:10},buttonText:{color:'#244AA8',fontWeight:'700',fontSize:12}});
