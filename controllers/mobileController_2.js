const {response} = require('express');
const bcrypt = require('bcryptjs');
const Tickets = require('../model/tickets');
const TicketsValues = require('../model/ticketValues');
const Attachments = require('../model/attachments')
const Mexico = require('../model/mexico');
const Applicants = require('../model/applicants');
const Comments =require('../model/comments');
var fs = require('fs');
const path = require('path')
const {sendEMail} = require('../helpers/mail');
const Status = require('../model/status');
const Requests = require('../model/requests');
const RequestsGroup = require('../model/requestGroup');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const User = require('../model/user');

const createNewTicket = async(req,res = response)=>{
    if(!req.body.ticket || !req.body.values){
        return res.status(400).json({status:false, msg: 'Ticket o Values faltante'})
    }
    const {IdRequest,IdChannel, IdStatus, IdForm, IdGroup, IdPriority,IdArea,IdApplicant} = req.body.ticket;
        const fields = req.body.values; 
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

for (let i = 0; i < fields.length; ++i) {
            if(fields[i].id==3){
                let colonias = fields[i].value;
                console.log(fields[i].value);
        if (typeof colonias === 'string') {
                let f = colonias.replace(/[|&;$%@":,<>()}+,]/g, ' ');
                let g = f.split('  ');
                colonias = {};
                colonias.sublocality = g[3];
                colonias.locality = g[1];
                }
        console.log(colonias);
        
                if(colonias.sublocality == '(null)' || colonias.sublocality=='' || colonias.sublocality==null){
        console.log('vacio'+colonias.sublocality);
console.log('vacio'+colonias.locality)
                    const _locality = await findLocality(colonias.locality);
                    if(!_locality){
                        TicketsValues.create({
                            IdTicket:ticket.IdTicket,
                            IdField:fields[i].id,
                            value: fields[i].value,
                            createdAt : new Date(),
                            updatedAt: new Date()
                        });
                        ticket.id_asenta_cpcons =  fields[i].value;
                        ticket.save()
  
                }
        }else{
console.log('else sublocality'+colonias.sublocality)
            const _locality = await findLocality(colonias.sublocality);
            if(!_locality){
                TicketsValues.create({
                    IdTicket:ticket.IdTicket,
                    IdField:fields[i].id,
                    value: fields[i].value,
                    createdAt : new Date(),
                    updatedAt: new Date()
                })
                ticket.id_asenta_cpcons =  fields[i].value;
                ticket.save()

            }else{
                TicketsValues.create({
                    IdTicket:ticket.IdTicket,
                    IdField:fields[i].id,
                    value: _locality.locality,
                    createdAt : new Date(),
                    updatedAt: new Date()
                })
                ticket.id_asenta_cpcons =  _locality.locality;


 ticket.save()
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
        }

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

async function findLocality (locality){
console.log(locality);
  try {
      const _locality  = await Mexico.findOne({where:{d_asenta:locality,c_mnpio:54},
        attributes:['id_asenta_cpcons','d_asenta','d_codigo']})
        if(!_locality){
            return null
        }
        let name = _locality.id_asenta_cpcons;
        let postal = _locality.d_codigo;
        return {locality:name,postal:postal};
  } catch (error) {
      console.log(error);
  }
}

const loginApplicant = async(req,res = response)=>{

    try {

	 const {firstName, lastName, lastName2, email, phone} = req.body;
        let _firstName = firstName.trim();
        //let _lastName = lastName.trim();
        //let _lastName2 = lastName2.trim();
        let _email = email.trim();
        let _phone = phone.trim();
        const emailExist = await Applicants.findOne({where:{email:_email}});
        console.log(req.body.applicant);
        const phoneExist = await Applicants.findOne({where:{phone:_phone}});
        
        if(emailExist){
            return res.status(200).json({status: true,msg: 'El correo ya esta registrado',data:emailExist.IdApplicant});
        }

        else if(phoneExist){
            return res.status(200).json({status: false,msg:'El teléfono ya esta registrado',data:phoneExist.IdApplicant});
        }else{

            const appl = await Applicants.create({
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
                 user:appl.IdApplicant,
                 data:appl.IdApplicant
             })
        }

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error al registrar al usuario'+error
        })
    }
}
async function sendEmailNew(id,ticket){
    console.log(`LOG de EMAIL: ${id}`)
    try {
        const applEmail = await Applicants.findOne({where:{IdApplicant:id}});
        if(applEmail.email){
            let sm = sendEMail(1,ticket,null,applEmail.email).then((data)=>{
                console.log(data);
            })
        }
    } catch (error) {
        console.log(error);
    }
    
}


const getDetailTicketByTicket = async(req,res = response)=>{
    try {
        const {IdTicket,IdApplicant} = req.body;

        let _ticket = await Tickets.findOne({
            where:{
                IdApplicant:IdApplicant,
                IdTicket:IdTicket
            },attributes:['createdAt','updatedAt'],
            include:[
                {model:Requests,attributes:['name']},
                {model:Status,attributes:['name']},
                {model:Mexico,attributes:[
                    [Sequelize.col('d_asenta'), 'colonia']
                ]},
                {model:TicketsValues,where:{
                    IdField:{[Op.in]:[1,2,4]}
                },
                    attributes:[
                        'IdField','value'
                    ]}
            ]
        });

        const _comments = await Comments.findAll({
            attributes:['createdAt','updatedAt','body','authorType'],
            where:{
                IdTicket:IdTicket
            },include:[
                {model:User,attributes:[
                    'firstName','lastName'
                ]}
            ]
        })

	res.status(200).json({
            status: true,
            result:_ticket,
            comments:_comments
        })

    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error al obtener tickets '+error
        })
    }

}

const getTicketsByStatus = async(req,res = response)=>{
    try {
        const {IdStatus,IdApplicant} = req.body;

        if(!IdStatus){
            return res.status(200).json({status: true,msg:'Es necesario ingresar un STATUS'}); 
        }

        const _tickets = await Tickets.findAndCountAll({
            where:{
                IdApplicant:IdApplicant,
                IdStatus:IdStatus
            },attributes:['createdAt','updatedAt','IdTicket'],
            include:[
                {model:Requests,attributes:['name']},
                {model:Status,attributes:['name']}
            ]
        });
	
	res.status(200).json({
            status: true,
            result:_tickets
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error al obtener tickets '+error
        })
    }
}

const getTicketsByApplicant = async(req,res = response)=>{
    try {
        const {IdApplicant, phone} = req.body;

        const _tickets = await Tickets.findAndCountAll({
            where:{
                IdApplicant:IdApplicant
            },attributes:['createdAt','updatedAt','IdTicket'],
            include:[
                {model:Requests,attributes:['name']},
                {model:Status,attributes:['name']}
            ]
        });
        res.status(200).json({
            status: true,
            result:_tickets
        })
        
    } catch (error) {

        res.status(500).json({
            status: false,
            msg:'Error al obtener tickets '+error
        })
    }
}


module.exports= {
    createNewTicket, uploadAttachment, loginApplicant, getTicketsByStatus, getDetailTicketByTicket, getTicketsByApplicant
}

