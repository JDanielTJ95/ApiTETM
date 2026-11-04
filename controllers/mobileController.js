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
const Delegaciones = require('../model/delegaciones');
const TolDelegaciones = require('../model/toldelegaciones');
const ApplicantMobile = require('../model/applicantMobile');

const createNewTicket = async(req,res = response)=>{
    if(!req.body.ticket || !req.body.values){
        return res.status(400).json({status:false, msg: 'Ticket o Values faltante'})
    }
    const {IdRequest,IdChannel, IdStatus, IdForm, IdGroup, IdPriority,IdArea,IdApplicant} = req.body.ticket;
        const fields = req.body.values; 
        const attachments = req.body.attachments;
        console.log(fields);
	console.log(IdApplicant);
	if(IdApplicant == 0 || IdApplicant=='0'){
	console.log(new Date());
	}
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
			console.log('Entro a _locality if',_locality);
			const d = await Delegaciones.findOne({where:{colonia:{[Op.like]: `%${fields[i].value}%`}}});
			if(d){ 
			 const t = await TolDelegaciones.findOne({where:{name:{[Op.like]: `%${d.delegacion}%`}}});
			console.log('TOLDEL = > ',t);
			TicketsValues.create({
                            IdTicket:ticket.IdTicket,
                            IdField:18,
                            value: t ? t.id : null,
                            createdAt : new Date(),
                            updatedAt: new Date()
                        });
			}
                        TicketsValues.create({
                            IdTicket:ticket.IdTicket,
                            IdField:fields[i].id,
                            value: fields[i].value,
                            createdAt : new Date(),
                            updatedAt: new Date()
                        });
                        ticket.id_asenta_cpcons =  fields[i].value;
                        ticket.save()
    
                    }else{
console.log('lleno'+colonias.sublocality)
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
	console.log(filePath);
	console.log(fileDir);

        fs.rename(fileTemp,filePath,err=>{
        if (err){console.log(err);
		return console.error(err);}else{
            return true;
        }
            
        });
        }else{
	console.log('elsesssssss')
	console.log(filePath);
        console.log(fileDir);
        fs.mkdirSync(fileDir, { recursive: true });
	
        await fs.copyFile(fileTemp,filePath,err=>{
            if (err) {
		console.log(err);
	return console.error(err);}else{
	console.log(fileDir);
	console.log(filePath);

	fs.unlink(fileTemp,(err=>{
	 if (err) {
                console.log(err);
        return console.error(err);}else{
	return true;}
		
}));
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
      const _locality  = await Mexico.findOne({where:{d_asenta:locality ? locality : null,c_mnpio:106},
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

    const {firstName, lastName, lastName2, email, phone,curp,device,longitude,latitude} = req.body;
        let _firstName = firstName.trim();
	console.log(phone)       
// let _lastName = lastName.trim();
        //let _lastName2 = lastName2.trim();
        let _email = email.trim();
        let _phone = phone.trim();
        const emailExist = await Applicants.findOne({where:{email:_email}});
        console.log('login start');
	console.log(new Date());
	console.log(req.body.applicant);
	console.log('login end')
        const phoneExist = await Applicants.findOne({where:{phone:_phone}});
	let _curp = curp ? curp.trim() : null;
    try {
        
        if(emailExist){
	await emailExist.update({
                firstName: _firstName,
                phone: _phone,
                device: device,
                latitude: latitude,
                longitude: longitude,
                fullName: `${_firstName}`,
                updatedAt: new Date()
            });
            return res.status(200).json({status: true,msg: 'El correo ya esta registrado',data:emailExist.IdApplicant,user:emailExist.IdApplicant});
        }

        else if(phoneExist){
	await phoneExist.update({
                firstName: _firstName,
                phone: _phone,
                device: device,
                latitude: latitude,
                longitude: longitude,
                fullName: `${_firstName}`,
                updatedAt: new Date()
            });
            return res.status(200).json({status: false,msg:'El teléfono ya esta registrado',data:phoneExist.IdApplicant,user:phoneExist.IdApplicant});
        }else{

            const appl = await Applicants.create({
                firstName:_firstName,
                //lastName:_lastName,
                //lastName2:_lastName2,
                email:_email,
                phone:_phone,
		curp:_curp,
                fullName:`${firstName}`,
                createdAt:new Date(),
		device:device,
		latitude:latitude,
		longitude:longitude
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
const getTicketsByApplicant = async(req,res = response)=>{
    try {
        const {IdApplicant, phone} = req.body;

        const _tickets = await Tickets.findAndCountAll({
            where:{
                IdApplicant:IdApplicant,
		IdStatus:{[Op.in]:[1,2,3]}
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
                    'firstName'
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

const updateApplicantByIdApplicant = async (req,res = response)=>{

    const {IdApplicant, token, latitude, longitude} = req.body.applicant;
    console.log(req.body.applicant)
    try {
        // Validar que los datos requeridos estén presentes
        if (!IdApplicant) {
            return res.status(400).json({
                status: false, 
                msg: 'IdApplicant es requerido'
            });
        }

        // Buscar si el applicant existe en ApplicantMobile
        let applicantMobile = await ApplicantMobile.findOne({
            where: { IdApplicant }
        });

        if (!applicantMobile) {
            // Si no existe, crear un nuevo registro
            const newTokens = Array.isArray(token) ? token : (token ? [token] : []);
            
            applicantMobile = await ApplicantMobile.create({
                IdApplicant: IdApplicant,
                token: newTokens,
                latitude: latitude || null,
                longitude: longitude || null,
                isActive: true,
                lastUsed: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            });

            return res.status(201).json({
                status: true,
                msg: 'Registro de applicant mobile creado exitosamente',
                data: {
                    action: 'created',
                    applicantMobile: applicantMobile,
                    tokensAdded: newTokens.length
                }
            });

        } else {
            // Si existe, actualizar el registro
            let currentTokens = Array.isArray(applicantMobile.token) ? applicantMobile.token : [];
            let newTokens = Array.isArray(token) ? token : (token ? [token] : []);
            
            // Filtrar tokens nuevos que no estén en la base de datos
            let tokensToAdd = newTokens.filter(newToken => 
                !currentTokens.includes(newToken)
            );
            
            // Combinar tokens existentes con los nuevos
            let updatedTokens = [...currentTokens, ...tokensToAdd];
            
            // Actualizar el registro
            await applicantMobile.update({
                token: updatedTokens,
                latitude: latitude !== undefined ? latitude : applicantMobile.latitude,
                longitude: longitude !== undefined ? longitude : applicantMobile.longitude,
                lastUsed: new Date(),
                updatedAt: new Date()
            });

            // Recargar para obtener datos actualizados
            await applicantMobile.reload();

            return res.status(200).json({
                status: true,
                msg: 'Applicant mobile actualizado exitosamente',
                data: {
                    action: 'updated',
                    //applicantMobile: applicantMobile,
                    //tokensAdded: tokensToAdd.length,
                    //totalTokens: updatedTokens.length,
                    //newTokensAdded: tokensToAdd
                }
            });
        }

    } catch (error) {
        console.error('Error en updateApplicantByIdApplicant:', error);
        res.status(500).json({
            status: false,
            msg: 'Error al actualizar applicant mobile: ' + error.message
        });
    }
}

module.exports= {
    createNewTicket, uploadAttachment, loginApplicant, getTicketsByApplicant, getDetailTicketByTicket, getTicketsByStatus, updateApplicantByIdApplicant

}

