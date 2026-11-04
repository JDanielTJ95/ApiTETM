const {response} = require('express');
const Requests = require('../model/requests');
const RequestsGroup = require('../model/requestGroup');
const Priority = require('../model/priority');
const Channels = require('../model/channels');
const Mexico = require('../model/mexico');
const Areas =require('../model/areas');
const {Op} = require('sequelize');
const RequestAreas = require('../model/requestareas');

const createNewRequestsGroup = async(req,res= response)=>{

    const {name,description,area} = req.body.group;
    const existsGroup = await RequestsGroup.findOne({where:{name:name}});
    console.log(area);
    if(existsGroup){
        return res.status(200).json({status:false,msg: 'El nombre ya esta asignado.'});
    }
    try {
        const resquestGroup = await RequestsGroup.create({
            name:name,
            createdAt : new Date(),
            updatedAt : new Date()
        });
        console.log(resquestGroup.IdRequestGroup);
        const ra = await RequestAreas.create({
            IdRequestGroup:resquestGroup.IdRequestGroup,
            IdArea:area.IdArea,
            createdAt:new Date(),
            updatedAt:new Date()
        })


        res.status(200).json({
            status: true,
            msg:'Grupo creado: '+ resquestGroup.name
        })

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se pudo crear el grupo.' + error
        })
    }
}

const getAllRequestsGroup = async(req,res= response)=>{
    let page=null;
    let offset = 0;
    let limit = 10;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 10; 
    }else{
        limit=1000;
    }
    try {
        const groups = await RequestsGroup.findAndCountAll({limit:limit,offset:offset,
            attributes:['IdRequestGroup','name'],
            order:[
                ['name','ASC']
            ],
            include:[{model:RequestAreas,include:[{model:Areas}]}]
         });

         res.status(200).json({
            status: true,
            data:groups
        })
    
       
    } catch (error) {
        res.status(500).json({
            status: true,
            msg:'Error, no se puden recuperar los grupos.'+error
        })
    }
}

const updateRequestGroup = async(req,res= response)=>{
    const {IdRequestGroup,name, area} = req.body.group;

    try {
        const rg = await RequestsGroup.findOne({where:{
            IdRequestGroup:IdRequestGroup
        }});
        rg.name = name;
        rg.updatedAt = new Date();
        rg.save();
        
        const rga = await RequestAreas.destroy({where:{
            IdRequestGroup:IdRequestGroup
        }});
        const rgan = await RequestAreas.create({
            IdRequestGroup:rg.IdRequestGroup,
            IdArea:area.IdArea,
            updatedAt:new Date()
        })

        res.status(200).json({
            status: true,
            data:rg.IdRequestGroup
        })


    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, al actualizar el grupo.' + error
        })
    }
}
const createNewRequests = async(req,res= response)=>{
    const {name,group, priority} = req.body.request;
    const existsRequest = await Requests.findOne({where:{name:name,IdRequestGroup:group.IdRequestGroup}});
    if(existsRequest){
        return res.status(200).json({status:false,msg: 'El nombre ya esta asignado.'});
    }
    try {
        const resquests = await Requests.create({
            name:name,
            createdAt : new Date(),
            updatedAt : new Date(),
            IdRequestGroup: group.IdRequestGroup,
            IdPriority: priority.IdPriority
        });

        res.status(200).json({
            status: true,
            msg:'Solicitud creada: '+ resquests.name
        });

    } catch (error) {
        res.status(500).json({
            status: true,
            msg:'Error, no se pudo crear la solicitud.'+error
        })
    }
}
//todas las solicitudes
const getAllRequests = async(req,res= response)=>{
    let page=null;
    let offset = 0;
    let limit = 10;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 10; 
    }else{
        limit=1000;
    }
    try {
        const requests = await Requests.findAndCountAll({limit:limit,offset:offset,
            order:[['name','ASC']],
            attributes:['IdRequest','IdRequestGroup','IdPriority','name','description'],
            include:[{model:RequestsGroup},{model:Priority}]
        });
        res.status(200).json({
            status: true,
            data:requests
        })
    } catch (error) {
        res.status(500).json({
            status: true,
            msg:'Error, no se puden recuperar los servicios.'
        })
    }
}

const updateRequest = async(req,res= response)=>{
    const {IdRequest,name,group, priority} = req.body.request;
    try {
        const reqs = await Requests.findOne({where:{
            IdRequest:IdRequest
        }});
        reqs.name = name;
        reqs.IdRequestGroup = group.IdRequestGroup;
        reqs.IdPriority = priority.IdPriority;
        reqs.updatedAt = new Date();
        reqs.save();
        
        res.status(200).json({
            status: true,
            data:reqs.IdRequest
        })

    } catch (error) {
        res.status(500).json({
            status: true,
            msg:'Error, no se pudo actualizar la solicitud.'+error
        })
    }
}
//solicitudes por grupo
const getRequestsByGroup = async(req,res= response)=>{
    const {IdRequestGroup} = req.body;
    try {
        const requests = await Requests.findAll({where:{IdRequestGroup:IdRequestGroup},
            include:[
                {model:RequestsGroup,attributes:['name']},
                {model:Priority,attributes:['name']}
            ],
            attributes:['IdRequest','name'],
            order:[
                ['name','ASC']
            ]
        });
        res.status(200).json({
            status: true,
            data:requests
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se puden recuperar los servicios.'+error
        })
    }
}

const getAllChannels = async(req,res= response)=>{

    try {
        const channel = await Channels.findAll();
        console.log(channel);
        res.status(200).json({
            status: true,
            data:channel
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se puden recuperar los grupos.'
        })
    }
}

const getCodigoByColonia = async(req,res= response)=>{
    const postal = req.body;

    try {
        const codigo = await Mexico.findAll({where:
            {c_mnpio:106,d_codigo:{[Op.like]:'%'+locality+'%'}},
            attributes:['id_asenta_cpcons','d_asenta','d_codigo']})
        res.status(200).json({
            status: true,
            data:codigo
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se puden recuperar los grupos.'
        })
    }
}

const getAllLocality = async(req,res= response)=>{
    const locality = req.body.locality;
    console.log(locality);
    try {
        const loc = await Mexico.findAll({where:{c_mnpio:106,d_asenta:{[Op.like]:'%'+locality+'%'}},
            attributes:['id_asenta_cpcons','d_asenta','d_codigo']});
            res.status(200).send(loc);

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se puden recuperar los grupos.'+error
        })
    }
}

const getLocalityById = async(req,res= response)=>{
    const locality = req.body.locality;
    console.log(locality);
    try {
        const loc = await Mexico.findAll({where:
            {c_mnpio:106,id_asenta_cpcons:locality},
            attributes:['id_asenta_cpcons','d_asenta','d_codigo']});
            res.status(200).send({
                data:loc,status:true});

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se puden recuperar los grupos.'+error
        })
    }
}

const getRequestAreas = async(req,res= response)=>{
    const IdRequestGroup = req.body.IdRequestGroup;
    try {
        const areasRequests = await RequestsGroup.findAll({
            where:{IdRequestGroup:IdRequestGroup},
            include:[{model:Areas}]
        });
            res.status(200).json({
                status: true,
                data:areasRequests
            })
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se puden recuperar los grupos.'+error
        })
    }
}

const getRequestbyAreas = async(req,res= response)=>{
    const areas = req.body.areas;
    console.log(areas);
    let _areas = [];
    for(let a of areas){
      await _areas.push({IdArea:a});
    }
    try {
        console.log(_areas);

        const arearequest = await RequestAreas.findAll({
            where:{[Op.or]:_areas},
            include:[{model:RequestsGroup,include:{model:Requests}}],
            order:[[{model:RequestsGroup},'name','ASC']]
        });

        res.status(200).json({
            status: true,
            data:arearequest
        })
    } catch (error) {
        res.status(500).json({
            status: true,
            data:error
        })
    }
}



module.exports = {createNewRequestsGroup, createNewRequests, getAllRequestsGroup, getAllRequests, getRequestsByGroup, getAllChannels, getCodigoByColonia,getAllLocality, getRequestAreas, getLocalityById, getRequestbyAreas,updateRequestGroup, updateRequest}
