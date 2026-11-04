const {response} = require('express');
const {Op} = require('sequelize');
const applicant = require('../model/applicants');
const Comments = require('../model/comments');
const Tickets = require('../model/tickets');
const TicketsValues = require('../model/ticketValues');

const createNewApplicant = async(req,res= response)=>{
        const {firstName, lastName, lastName2, email, phone} = req.body.applicant;
        //let _lastName2;
        let _email;
        /*if(lastName2){
            _lastName2 =  lastName2.trim();
        }*/
        if(email){
            _email = email.trim();
        }
       	let _firstName = firstName.trim();
        //let _lastName = lastName.trim();
        let _phone = phone.trim();
        const emailExist = await applicant.findOne({where:{email:_email}});
        console.log(req.body.applicant);
        if(emailExist){
            return res.status(200).json({status: false,msg: 'El correo ya esta registrado',data:emailExist});
        }
        const phoneExist = await applicant.findOne({where:{phone:_phone}});
        if(phoneExist){
            return res.status(200).json({status: false,msg:'El teléfono ya esta registrado',data:phoneExist});
        }
    try {
        
        const appl = await applicant.create({
           firstName:_firstName,
           //lastName:_lastName,
           //lastName2:_lastName2,
           email:_email,
           phone:_phone,
           fullName:`${firstName}`,
           createdAt:new Date()
        });
        res.status(200).json({
            status: true,
            user:appl
        })

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se pudo crear el solicitante.'+error
        })
    }
}

const getApplicantByQuery = async(req,res= response)=>{
    const {search} = req.body;
    try {
        const appl = await applicant.findAll({
            where:{
                [Op.or]:[
                    {firstName:{[Op.like]:'%'+search+'%'}},
                    {lastName:{[Op.like]:'%'+search+'%'}},
                    {lastName2:{[Op.like]:'%'+search+'%'}},
                    {phone:{[Op.like]:'%'+search+'%'}}
                ]
            }
        });
        if(appl.length>0){
            res.status(200).send(
                appl
            );
        }else{
            res.status(200).send(
                appl
            );
        }
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error en la consulta: '+error
        });
    }
}

const updateApplicant = async (req,res = response)=>{
    const {IdApplicant,firstName, lastName, lastName2, email, phone} = req.body.applicant;
    console.log('data',email);
    
    try {
        if(email){
            const emailExist = await applicant.findOne({where:{email:email}});
        if(emailExist){
            if(emailExist.IdApplicant != IdApplicant){
                return res.status(200).json({status: false,msg: 'El correo ya esta registrado para otro solicitante',data:emailExist});
            }
        }
        }
        const phoneExist = await applicant.findOne({where:{phone:phone}});
        if(phoneExist){
            if(phoneExist.IdApplicant != IdApplicant){
                return res.status(200).json({status: false,msg: 'El teléfono ya esta registrado para otro solicitante',data:phoneExist});
            }
        }

        const applicantlUpdate =  await applicant.findOne({where:{IdApplicant:IdApplicant}});
        applicantlUpdate.firstName = firstName;
        applicantlUpdate.lastName = lastName;
        applicantlUpdate.lastName2 = lastName2;
        applicantlUpdate.email = email;
        applicantlUpdate.phone = phone;
        applicantlUpdate.save();

        res.status(200).json({
            status: true,
            user:applicantlUpdate
        })

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se pudo actualizar el solicitante.'+error
        })
    }
}

const deleteApplicant = async (req,res = response)=>{
    const {IdApplicant} =req.body.applicant;

    try {
        const appl = await applicant.findOne({where:{IdApplicant:IdApplicant}});
        
        let applTickets = await Tickets.findAll({where:{IdApplicant:IdApplicant}});
        applTickets.map(async (m)=>{
            console.log(m.IdTicket)
            let cm = await Comments.destroy({where:{IdTicket
            :m.IdTicket}});
            let tv = await TicketsValues.destroy({where:{IdTicket:m.IdTicket}});
        });
        applTickets = await Tickets.destroy({where:{IdApplicant:IdApplicant}});
        appl.destroy();

        res.status(200).json({
            status: true,
            data:'done'
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: false,
            msg:'Error, no se pudo actualizar el solicitante.'+error
        })
    }
}

module.exports = {createNewApplicant, getApplicantByQuery, updateApplicant, deleteApplicant}
