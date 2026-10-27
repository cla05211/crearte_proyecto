require('dotenv').config({path: process.cwd()+'/.env'});
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const sb = createClient(url, key);
(async()=>{
 const {data,error}=await sb.from('precios_productos').select('id_producto,cuotas,cantidad_desde,cantidad_hasta,valor_senia,valor_cuota').order('id_producto').order('cuotas').order('cantidad_desde');
 if(error) return console.log(error);
 console.log(data.length); data.forEach(r=>console.log(JSON.stringify(r)));
})();
