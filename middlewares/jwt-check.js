const {response} = require('express');
const jwt = require('jsonwebtoken');
const Apiconnection = require('../model/apiconnection');
const Users = require('../model/user')
const validarJWT = async (req,res=response, next)=>{

    // LEER TOKEN
const token = req.header('x-token'); 
const tokenApi = req.header('x-token-api'); 
    
    if(!token && !tokenApi){
        return res.status(401).json({status:false, msg: 'Autenticación faltante'});

    }else if(tokenApi && !token){
        return validarApi(req,res,next);
    }

    try{
    
        jwt.verify(token, process.env.JWT_SECRET, async function(err, decoded){
            if(err){
                
                return res.status(401).json({status:false, msg: err.message});

            }else{
                const {user_id} = decoded;
                const uid =  await Users.findOne({where:{
                    IdUser:user_id
                }})
                if(uid.active){
                    console.log(req.ocp);
                    req.user_id = user_id;
                    
                    if(req.body.ocp){
                        req.ocp = req.body.ocp
                    }
                    next();
                }else{
                    console.log('inactive')
                    return res.status(401).json({status:false, msg: 'El usuario esta inactivo'});
                }
               

            }
            
        });
        // console.json(user_id);

    }catch(error){
        return res.status(401).json({status:false, msg: 'Token no valido'});
    }

}

const validarApi  = async (req,res=response, next)=>{

    // LEER TOKEN
    const token = req.header('x-token-api'); 
    
    if(!token){
        return res.status(401).json({status:false, msg: 'AccessToken faltante'})
    }

    try{
        const api = await Apiconnection.findOne({where:{key:token}});

        if(!api){
            return res.status(401).json({status:false, msg: 'AccessToken erroneo'});
        }else{
            api.status == 1  ? next() : res.status(401).json({status:false, msg: 'AccessToken no habilitado'});
        }

    }catch(error){
        console.log(error);
        return res.status(401).json({status:false, msg: 'AccessToken no valido'});
    }

}



module.exports = {
    validarJWT,validarApi
}
