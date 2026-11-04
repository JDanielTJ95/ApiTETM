const {response} = require('express');
const User = require('../model/user');
const Role = require('../model/roles');
const Token =require('../model/token')
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {sendEMail} = require('../helpers/mail');
const { generarJWT } = require('../helpers/generateJwt');

const login = async (req, res = response) =>{
    const {email, password} = req.body;
    console.log(req.body);
    try{
        const user = await User.findOne({where:{email:email},
            include:[
                {model:Role,attributes:['name']},
            ],
            });
            console.log(user);
        if(!user){
            return res.status(200).json({status:false, msg: 'Email no valido.'})
        }
        const validPass = bcrypt.compareSync(password, user.password);
        if(!validPass){
            return res.status(200).json({status: false,msg:'La contraseña no es valida'});
        }
        if(!user.active){
            return res.status(200).json({status: false,msg:'Usuario no activo. Pongase en contacto con el administrador.'});
        }
        const r = await generarJWT(user.IdUser);
        res.status(200).json({
         status: true,
           token:r.token,
           exp:r.exp,
           role:user.role.name,
           group:user.IdGroup,
           name:`${user.firstName} ${user.lastName}`,
           mc:user.mc,
           ocp:user.ocp
        });
    }catch(error){
        console.log(error);
        res.status(500).json({
            status: false,
            msg:'Error inesperado'
        });
    }
    
}
const recoverPassword = async (req,res = response)=>{
    const {email} = req.body; 
    try {
    const user = await User.findOne({ where:{email:email} });

    if (!user) {
        return res.status(200).json({status:false, msg: 'Email no valido.'});
    }
    let token = await Token.findOne({ userId: user.IdUser });
    if (token){
        token.destroy();
    }
    const salt = bcrypt.genSaltSync();
    let resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken,salt);

    let tk = await Token.create({
    userId: user.IdUser,
    token: hash,
    createdAt: Date.now(),
  });

  const link = `?token=${resetToken}&id=${user.IdUser}`;
  sendEMail(3,0,link,email);

    res.status(200).json(
        {status:true, 
        msg: 'Enviado'}); 
    } catch (error) {
        res.status(500).json(
            {status:false, 
            msg: 'Error'+error}); 
    }
}
const reLogin = async (req, res = response) =>{
    const userid = req.user_id;
    const token = await generarJWT(userid);
    const user = await User.findOne({where:{IdUser:userid},
        include:[
            {model:Role,attributes:['name']},
        ],
        });

    res.json({
        status: true,
        token:token,
        role:user.role.name
    })
}
const resetPassword = async  (req,res = response)=>{
    const {token, userId, info} = req.body;

    try {
        let passwordResetToken = await Token.findOne({where:{userId:userId}});
        if(!passwordResetToken){
             res.status(200).json({status:false, msg: 'Enlace no es valido o expiró'});
        }
        const isValid =await bcrypt.compare(token,passwordResetToken.token);
        if(!isValid){
            res.status(200).json({status:false, msg: 'Enlace no es valido o expiró'});
        }
        if(info){
            console.log(info);
            const salt = bcrypt.genSaltSync();
            await User.update({ password: bcrypt.hashSync(info.password,salt) }, {
                where: {
                   IdUser: userId
                }
              });

            res.status(200).json({status:true, msg: 'Correcta2'});

        }else{
            res.status(200).json({status:true, msg: 'Correcta'});
        }
        
    } catch (error) {
       console.log(error);
    }
}


module.exports = {login, reLogin,recoverPassword,resetPassword}