const {response} = require('express');
const Mexico = require('../model/mexico');
const Requests = require('../model/requests')
const RequestsGroup = require('../model/requestGroup')
const Priority = require('../model/priority');
const Areas = require('../model/areas');
const Applicants = require('../model/applicants');
const Tickets = require('../model/tickets');
const TicketsValues = require('../model/ticketValues');
const Comments = require('../model/comments');
const Attachments = require('../model/attachments')
const {sendEMail} = require('../helpers/mail');

var fs = require('fs');
const path = require('path')


const getAllLocality = async(req,res= response)=>{
    const locality = req.body.locality;
    console.log(locality);
    try {
        const loc = await Mexico.findAll({where:{c_mnpio:54},
            attributes:['id_asenta_cpcons','d_asenta','d_codigo']});
            res.status(200).send(loc);

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se puden recuperar los grupos.'+error
        })
    }
}

const getAllRequests = async(req,res= response)=>{
    
    try {
        const requests = await Requests.findAll({
            order:[['name','ASC']],where:{IdRequest:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,28,29,30,31,32,33,34,35,36,37,38,39]},
            attributes:['IdRequest','IdRequestGroup','IdPriority','name','description'],
            include:[{model:RequestsGroup,include:[{model:Areas}]},{model:Priority}]
        });
        res.status(200).json({
            status: true,
            data:requests
        })
    } catch (error) {
        res.status(500).json({
            status: true,
            msg:'Error, no se puden recuperar los servicios.'+error
        })
    }
}

const loginApplicant = async(req,res = response)=>{

    const {firstName, lastName, lastName2, email, phone} = req.body.applicant;
        let _firstName = firstName.trim();
        let _lastName = lastName.trim();
        let emailExist;
        let phoneExist;

        if(lastName2){
            let _lastName2 = lastName2.trim();
        }
        if(email){
            let _email = email.trim();
            emailExist = await Applicants.findOne({where:{email:_email}});
        }
        if(phone){
            let _phone = phone.trim();
            phoneExist = await Applicants.findOne({where:{phone:_phone}});
        }
    try {
        
        if(emailExist){
            return res.status(200).json({status: true,msg: 'El correo ya esta registrado',data:emailExist.IdApplicant});
        }

        else if(phoneExist){
            return res.status(200).json({status: false,msg:'El teléfono ya esta registrado',data:phoneExist.IdApplicant});
        }else{

            const appl = await Applicants.create({
                firstName:_firstName,
                lastName:_lastName,
                lastName2:_lastName2,
                email:_email,
                phone:_phone,
                fullName:`${firstName} ${lastName} ${lastName2}`,
                createdAt:new Date()
             });
             res.status(200).json({
                 status: true,
                 user:appl.IdApplicant,
                 data:appl.IdApplicant
             })
        }

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error al registrar al usuario'
        })
    }
}

const createNewTicket = async(req,res = response)=>{
    if(!req.body.ticket || !req.body.fields){
        return res.status(400).json({status:false, msg: 'Ticket o Values faltante'})
    }
    const {IdRequest,IdChannel, IdStatus, IdForm, IdGroup, IdPriority,IdArea,IdApplicant} = req.body.ticket;
        const fields = req.body.fields; 
        const attachments = req.body.attachments;
        console.log(fields)

    try {
        const ticket = await Tickets.create({
            IdPriority: IdPriority,
            IdChannel: IdChannel,
            IdStatus : IdStatus,
            IdRequest : IdRequest,
            IdForm: IdForm,
            IdGroup: IdGroup,
            IdArea: IdArea,
            IdApplicant: IdApplicant,
            createdAt : new Date(),
            updatedAt: new Date()
        });

        if(attachments){
            const _comment = await Comments.create({
                IdAuthor : IdApplicant,
                body : '',
                createdAt:new Date(),
                updatedAt:new Date(),
                IdChannel: ticket.IdChannel,
                IdTicket:ticket.IdTicket,
                authorType:'Applicant'
            });
            _comment.save();
            console.log('entro sin comments')
            saveAttachment(attachments,_comment.IdComment)
        }
/*         for (let i = 0; i < fields.length; ++i) {
            if(fields[i].id==3){
                const colonias = fields[i].value;
                if(colonias.sublocality == '(null)'){
                    const _locality = await findLocality(colonias.locality);
                    if(!_locality){
                        TicketsValues.create({
                            IdTicket:ticket.IdTicket,
                            IdField:fields[i].id,
                            value: fields[i].value,
                            createdAt : new Date(),
                            updatedAt: new Date()
                        })
    
                    }else{
                        TicketsValues.create({
                            IdTicket:ticket.IdTicket,
                            IdField:fields[i].id,
                            value: _locality.locality,
                            createdAt : new Date(),
                            updatedAt: new Date()
                        })
    
                    }
                }else{
                    const _locality = await findLocality(colonias.sublocality);
                    if(!_locality){
                        TicketsValues.create({
                            IdTicket:ticket.IdTicket,
                            IdField:fields[i].id,
                            value: fields[i].value,
                            createdAt : new Date(),
                            updatedAt: new Date()
                        })
    
                    }else{
                        TicketsValues.create({
                            IdTicket:ticket.IdTicket,
                            IdField:fields[i].id,
                            value: _locality.locality,
                            createdAt : new Date(),
                            updatedAt: new Date()
                        })
    
                    }
                }
               
            }
            else{
                TicketsValues.create({
                    IdTicket:ticket.IdTicket,
                    IdField:fields[i].id,
                    value: fields[i].value,
                    createdAt : new Date(),
                    updatedAt: new Date()
                })
            }
        } */

        for(let f of fields){
            TicketsValues.create({
                IdTicket:ticket.IdTicket,
                IdField:f.id,
                value: f.value,
                createdAt : new Date(),
                updatedAt: new Date()
            })
        }

        sendEmailNew(IdApplicant,ticket.IdTicket);

        res.status(200).json({
            status: true,
            data:ticket.IdTicket
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error: '+error
        })
    }

}

const uploadAttachment = async (req, res = response) =>{

    if(!req.files){
        return res.status(400).json({status:false, msg: 'Files faltante'})
    }
    const filesAttachments = req.files;
   
        try {

            let filesReturn = []
           
            await Promise.all(filesAttachments.map(async (file) => {
                let pathTemp = file.path;
                let fileName = file.filename;
                let fileExt = file.mimetype.split('/').pop();
                let now = fileName;
                let fileDir = `./uploads/${now}`;
                let filePath = `./uploads/${now}/${fileName}.${fileExt}`;
                let contents = await saveFiles(filePath,fileDir,pathTemp)
                filesReturn.push(`${fileName}.${fileExt}`);
              }));
              console.log(filesReturn);
              res.status(200).json({
                status: true,
                data:filesReturn
            })
               
    } catch (error) {

     res.status(500).json({
        status: false,
        msg:'Error: '+error
    })
    }
}

const saveFiles = async (filePath,fileDir,fileTemp) =>{
    if (fs.existsSync(fileDir)) {

        fs.rename(fileTemp,filePath,err=>{
        if (err){return console.error(err);}else{
            return true;
        }
            
        });
        }else{

        fs.mkdirSync(fileDir, { recursive: true });

        fs.rename(fileTemp,filePath,err=>{
            if (err) {return console.error(err);}else{
                return true;
            }

            });
    }
}

async function saveAttachment (data,commentId){
    console.log(data);
    console.log(commentId);
    try {
          await Promise.all(data.map(async item=>{
            const _comment = await Attachments.create({
                IdComment:commentId,
                fileName: item,
                url:process.env.URL_UPLOADS+item
            });
            _comment.save();
          }))
    } catch (error) {
        console.log(error);
        
    }
}

const startVerify = async (req,res = response)=>{
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);
    
    client.verify.services('VA9d7cd3f4ce3aaec7cb0fdcd598fce984')
             .verifications
             .create({to: '+52'+req.body.telefono, channel: 'sms'})
             .then((verification) =>{
                res.status(200).json({
                    status: true,   
                    data: verification.status
                }); 
             });
}
const checkVerification = async (req,res = response)=>{
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken); 
    
   (async () => {
        try {

        const ver = await client.verify.services('VA9d7cd3f4ce3aaec7cb0fdcd598fce984')
         .verificationChecks
         .create({to: '+52'+req.body.telefono, code: req.body.codigo});
       
            if(ver.valid){
                
            res.status(200).json({
                status: true,   
                data:ver.valid
            }); 

            }else{
                res.status(400).json({
                    status: false,   
                    msg: 'Codigo Incorrecto'
                }); 
            }
            
        } catch (error) {
            console.log(error);
            res.status(400).json({
                status: false,   
                msg: 'Codigo Incorrecto'
            }); 
        };
    })();
 
   }

   async function sendEmailNew(id,ticket){
    console.log(`LOG de EMAIL: ${id}`)
    try {
        const applEmail = await Applicants.findOne({where:id});
        if(applEmail.email){
            let sm = sendEMail(1,ticket,null,applEmail.email).then((data)=>{
                console.log(data);
            })
        }
    } catch (error) {
        console.log(error);
    }
    
}

module.exports = {getAllLocality, getAllRequests, loginApplicant, createNewTicket, uploadAttachment,startVerify, checkVerification}
