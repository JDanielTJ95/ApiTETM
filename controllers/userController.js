const {response} = require('express');
const bcrypt = require('bcryptjs');
const Users = require('../model/user');
const Roles = require('../model/roles');
const Groups = require('../model/groups');
const AreasAgents = require('../model/areasagents');
const Areas = require('../model/areas');
const { generarJWT } = require('../helpers/generateJwt');
const AreasAgentes = require('../model/areasagents');
const RequestsGroup = require('../model/requestGroup');
const {sendEMail} = require('../helpers/mail');
const { Op } = require("sequelize");
const createNewUser = async(req,res = response)=>{
    const {firstName,lastName,role,password,email,area,active,mc,IdArea} = req.body.user; 
    console.log(req.body.user)
    try {
        const existeEmail = await Users.findOne({where:{email:email}})
        if(existeEmail){
            return res.status(200).json({status:false,msg: 'El correo ya esta registrado'});
        }
        const salt = bcrypt.genSaltSync();
        const u = await Users.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: bcrypt.hashSync(password, salt),
            IdRole: role.IdRole,
            active:active,
            IdArea:IdArea.IdArea,
            mc:mc,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        area.map(async (a)=>{
            await AreasAgentes.create({
                IdArea:a.IdArea,
                IdUser:u.IdUser,
                createdAt:new Date(),
                updatedAt:new Date()
            })
        })
        //const token = await generarJWT(u.IdUser)
        //sendEMail(4,0,'',email,email,password)
        res.status(200).json({
            status: true,
            result:u.IdUser
            //token:token
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: false,
            msg:'Error inseperado...revisar logs'
        })
    }
   
   
}

const updateUser = async(req,res = response)=>{
    const {IdUser, firstName, lastName, role, area,active,mc,ocp,IdArea} = req.body.user;
    try {
        console.log(req.body.user);
        const u = await Users.findOne({where:{
            IdUser:IdUser
        }});
        u.firstName = firstName;
        u.lastName = lastName;
        u.IdRole = role.IdRole;
        u.active = active;
        u.mc = mc;
        u.ocp = ocp;
        u.IdArea = IdArea.IdArea ? IdArea.IdArea : 
        u.save();

        console.log('valor');

        const areasUsers = await AreasAgentes.destroy({
            where:{IdUser:IdUser
        }})

        Promise.all(
            area.map(async (item)=>{
                const au = await AreasAgentes.create({
                    IdUser:IdUser,
                    IdArea:item.IdArea
                })
            })
        )

        res.status(200).json({
            status: true,
            result:u.ocp
        });
    } catch (error) {
        
    }
}
const updatePassword = async (req, res =response)=>{
    
    const {IdUser, password} = req.body.user;
    try {
        const salt = bcrypt.genSaltSync();
        const u = await Users.findOne({where:{
            IdUser:IdUser
        }});
        u.password= bcrypt.hashSync(password, salt),
        u.save();
        res.status(200).json({
            status: true,
            result:u.IdUser
        });
    }catch(error){
        res.status(500).json({
            status: true,
            msg:'Error'+error
        });
    }

}
const getAllUsers = async(req,res = response)=>{
    let limitQ;
    let page=null;
    let offset = 0;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 10; 
     limitQ=10;
    }
    console.log(offset);
    try {
        const users = await Users.findAndCountAll({distinct: true,limit:limitQ,offset:offset,order: [['createdAt', 'DESC']],
            attributes:['IdUser','firstName','lastName','email','createdAt','active','mc','ocp','IdArea'],
            include:[{model:Roles,attributes:['IdRole','description','name']},
        {model:AreasAgentes,include:[{model:Areas}]}]
       });
        res.status(200).json({
            status: true,
            result:users
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: false,
            msg:'Error en el sistema',error
        })
    }
   
   
}

const getAllRoles = async(req,res = response)=>{
    try {
        const roles = await Roles.findAll({});
        res.status(200).json({
            status: true,
            result:roles
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: false,
            msg:'Error en el sistema',error
        })
    }
}

const getAllAreas = async(req,res = response)=>{

    let page=null;
    let offset = 0;
    limit = 10;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 10; 
    }else{
        limit=1000;
    }
    try {
        const group = await Areas.findAndCountAll({ order:[['name','ASC']],distinct: true,limit:limit,offset:offset,
            attributes:['IdArea','name','IdUser']
        });
        res.status(200).json({
            status: true,
            result:group
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error en el sistema',error
        })
    }
}

const createNewArea = async(req,res = response)=>{
        const {name} = req.body.area;
        
    try {
        const ar = await Areas.create({
            name:name,
            createdAt:new Date()
        });

        res.status(200).json({
            status: true,
            result:ar.IdArea
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error en el sistema',error
        }) 
    }

}
const updateArea = async(req,res = response)=>{
    const {IdArea, name, IdUser} = req.body.area;
    console.log(name)

    try {
        const ar = await Areas.findOne({where:{IdArea:IdArea}});
        ar.name = name;
        ar.updatedAt = new Date();
        ar.IdUser = IdUser;
        ar.save();

        res.status(200).json({
            status: true,
            result:ar.IdArea
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error en el sistema',error
        })
    }
}
const getUsersByAreas = async (req,res = response)=>{
    const IdArea = req.body.IdArea;
    console.log(IdArea)
    try {
    const usersAreas = await Areas.findAll({where:{IdArea:IdArea},attributes:['IdArea','name'],
        include:[{model:Users,attributes:['IdUser','firstName','lastName','mc','ocp'],
        include:[{model:Roles,attributes:['IdRole','name'],
        where:{
            [Op.or]: [
                { IdRole: 1 },
                { IdRole: 2 },
                { IdRole: 3 }
              ]
        }}]}]
    });
    res.status(200).json({
        status: true,
        data:usersAreas
    });

    } catch (error) {
        res.status(500).json({
            status: true,
            result:error
        });
    }
}

const getAreasByUsers = async (req,res = response)=>{
    let IdUser;

    if(req.body.IdUser){
        IdUser = req.body.IdUser;
    }else{
        IdUser = req.user_id
    }
    try {
    const usersAreas = await Users.findAll({where:{IdUser:IdUser},attributes:['IdUser','firstName','lastName'],
        include:[
            {model:Areas,
                attributes:['IdArea','name','IdUser'],include:[{model:RequestsGroup}]
            }]
    });

    res.status(200).json({
        status: true,
        data:usersAreas
    });

    } catch (error) {
        res.status(500).json({
            status: true,
            result:error
        });
    }
}
const setAreasByUser = async (req,res = response)=>{

        const setiduser = req.body.iduser;
        const setareas = req.body.areas;

    try {
        let removeareas = await AreasAgentes.destroy({
            where:{IdUser:setiduser}
        });
        
        for(let i of setareas){
            let areaagent = await AreasAgentes.findOne({where:{IdUser:setiduser,IdArea:i}});
            if(areaagent){
                console.log('existe');
            }else{
            await AreasAgentes.create({
                IdUser: setiduser,
                IdArea:i,
                createdAt:new Date(),
                updatedAt:new Date()
            })
            }
        }
        res.status(200).json({
            status: true,
            data:'Termino'
        });

    } catch (error) {
        res.status(500).json({
            status: true,
            data:error
        });
    }
}


module.exports = {createNewUser, getAllUsers, getAllRoles, getAllAreas, getUsersByAreas, getAreasByUsers, setAreasByUser,updateUser, createNewArea, updateArea, updatePassword}
