const {response} = require('express');
const Status = require('../model/status');


const createNewStatus = async(req,res= response)=>{

    const {name, description} = req.body;
    
    try {
        const status = await Status.create({
            name:name,
            description: description
        });
        res.status(200).json({
            status: true,
            msg:'Status creado: '+ status.name
        })
    } catch (error) {
        res.status(500).json({
            status: true,
            msg:'Error: '+error
        })
    }
}

const getAllStatus = async(req,res= response)=>{
    
    try {
        const status = await Status.findAll({
            attributes:['IdStatus','name']
        });
        res.status(200).json({
            status: true,
            data:status
        })
    } catch (error) {
        res.status(500).json({
            status: true,
            msg:'Error: '+error
        })
    }
}

module.exports = {createNewStatus, getAllStatus}