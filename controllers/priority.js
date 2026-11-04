const {response} = require('express');
const Priority = require('../model/priority');

const createNewPriority = async(req,res = response)=>{
    const {name,description} = req.body;
    try {
        const priority = Priority.create({
            name:name,
            description:description,
            createdAt:new Date(),
            updatedAt:new Date()
        });
        res.status(200).json({
            status: true,
            msg:'Prioridad creada'+ priority
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error,'+error
        })
    }
}

const getAllPrioritys = async(req,res = response)=>{
   
    try {
        const priority = await Priority.findAll();

        res.status(200).json({
            status: true,
            data:priority
        })
        
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error,'+error
        })
    }
}

module.exports = { createNewPriority, getAllPrioritys};