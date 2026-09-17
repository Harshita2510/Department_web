import mongoose from 'mongoose';

export function health(_request,response){
  response.json({success:true,data:{service:'sgsits-api',database:mongoose.connection.readyState===1?'connected':'disconnected',timestamp:new Date().toISOString()}});
}
