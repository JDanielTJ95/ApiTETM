const {response} = require('express');
const bcrypt = require('bcryptjs');
const Tickets = require('../model/tickets');
const TicketsValues = require('../model/ticketValues');
const Applicants = require('../model/applicants');
const Roles = require('../model/roles');
const Groups = require('../model/groups');
const Status  = require('../model/status');
const { generarJWT } = require('../helpers/generateJwt');
const {dateSeries} = require('../helpers/dates')
const Requests = require('../model/requests');
const RequestsGroup = require('../model/requestGroup');
const Areas = require('../model/areas');
const Channel = require('../model/channels');
const Priority = require('../model/priority');
const Fields = require('../model/fields');
const FieldsTypes = require('../model/fieldsTypes');
const Comments = require('../model/comments')
const Attachments =  require('../model/attachments');
const User = require('../model/user');
const mcidentifier = require('../model/mcid');

const { Op, Sequelize, where } = require("sequelize");
const Mexico = require('../model/mexico');
const moment = require('moment');
//moment.locale('es-mx')
const {sendEMail} = require('../helpers/mail');
const { raw } = require('body-parser');
const Transactions = require('../model/transactions');
const Custom = require('../model/custom');
const Delegaciones = require('../model/delegaciones');
const TolDelegaciones = require('../model/toldelegaciones');
const Survey = require('../model/surveys');
const SurveyResponse = require('../model/surveyresponse');
const ApplicantMobile = require('../model/applicantMobile');

const TRABAJO_CATALOG = {
    1: "Bacheo",
    2: "Pavimentación", 
    3: "Repavimentación"
};
const MATERIAL_CATALOG = {
    1: "Asfalto",
    2: "Concreto",
    3: "Adoquín",
    4: "Asfalto sobre Concreto",
    5: "Asfalto sobre Adoquín",
    6: "Terracería",
    7: "Terracería y Asfalto"
};

const SEGUIMIENTO_CATALOG = {
    1: "Contactar Solicitante",
    2: "Programar Visita"
};

const COMENTARIOS_CATALOG = {
    1: "Jurisdicción Estatal",
    2: "Jurisdicción Federal",
    3: "Fuera de Jurisdicción Territorial",
    4: "Solicitud No Correspondiente a Bacheo",
    5: "Fraccionamiento",
    6: "Coordenada No Coincidente"
};


const DELEGACION_CATALOG = {
    1: "Adolfo López Mateos",
    2: "Árbol De Las Manitas",
    3: "Barrios Tradicionales",
    4: "Cacalomacán",
    5: "Calixtlahuaca",
    6: "Capultitlán",
    7: "Centro Histórico",
    8: "Cerrillo Vista Hermosa",
    9: "Ciudad Universitaria",
    10: "Colón",
    11: "Del Parque",
    12: "Felipe Chávez Becerril",
    13: "Independencia",
    14: "La Maquinita",
    15: "Metropolitana",
    16: "Moderna De La Cruz",
    17: "Morelos",
    18: "Nueva Oxtotitlán",
    19: "San Andrés Cuexcontitlán",
    20: "San Antonio Buenavista",
    21: "San Buenaventura",
    22: "San Cayetano Morelos",
    23: "San Cristóbal Huichochitlán",
    24: "San Felipe Tlalmimilolpan",
    25: "San Juan Tilapa",
    26: "San Lorenzo Tepaltitlán",
    27: "San Marcos Yachihuacaltepec",
    28: "San Martín Toltepec",
    29: "San Mateo Otzacatipan",
    30: "San Mateo Oxtotitlán",
    31: "San Pablo Autopan",
    32: "San Pedro Totoltepec",
    33: "San Sebastián",
    34: "Sánchez",
    35: "Santa Ana Tlapaltitlán",
    36: "Santa Cruz Atzcapotzaltongo",
    37: "Santa María De Las Rosas",
    38: "Santa María Totoltepec",
    39: "Santiago Miltepec",
    40: "Santiago Tlacotepec",
    41: "Santiago Tlaxomulco",
    42: "Sauces",
    43: "Seminario 2 de marzo",
    44: "Seminario Conciliar",
    45: "Seminario Las Torres",
    46: "Tecaxic",
    47: "Tlachaloya",
    48: "Universidad"
};

// Función helper actualizada para mapear catálogos
const getCatalogValue = (catalogType, id) => {
    const catalogs = {
        trabajo: TRABAJO_CATALOG,
        material: MATERIAL_CATALOG,
        seguimiento: SEGUIMIENTO_CATALOG,
        comentarios: COMENTARIOS_CATALOG,
        delegacion: DELEGACION_CATALOG
    };
    
    const catalog = catalogs[catalogType];
    if (!catalog) return `Catálogo '${catalogType}' no encontrado`;
    
    return catalog[id] || `ID: ${id} (No encontrado en ${catalogType})`;
};


const createNewTicket = async(req,res = response)=>{
    const {IdRequest,IdChannel, IdStatus, IdForm, IdUser, IdGroup, IdPriority,IdArea,IdApplicant} = req.body.ticket;
    const fields = req.body.values; 
    const comment = req.body.comment.editorData;
    const attachments = req.body.attachments;
    try {
    
        const ticket = await Tickets.create({
            IdPriority: IdPriority,
            IdChannel: IdChannel,
            IdStatus : IdStatus,
            IdRequest : IdRequest,
            IdForm: IdForm,
            IdUser: IdUser,
            IdGroup: IdGroup,
            IdArea: IdArea,
            IdApplicant: IdApplicant,
            createdAt : new Date(),
            updatedAt: new Date()
        });
        let isOcp=false;
            for await(let i of fields){
                if(i.id==9){
                    isOcp = true;
                }
            }

        if(comment){
            const _comment = await Comments.create({
                IdAuthor : req.user_id,
                body : comment,
                createdAt:new Date(),
                updatedAt:new Date(),
                IdChannel: ticket.IdChannel,
                IdTicket:ticket.IdTicket,
                authorType:'Team'
            });
            _comment.save();
            ///console.log('entro Attach')
            
            saveAttachment(attachments,_comment.IdComment,isOcp)
        }
        if(!comment && attachments){
            const _comment = await Comments.create({
                IdAuthor : req.user_id,
                body : '',
                createdAt:new Date(),
                updatedAt:new Date(),
                IdChannel: ticket.IdChannel,
                IdTicket:ticket.IdTicket,
                authorType:'Team'
            });
            _comment.save();
            saveAttachment(attachments,_comment.IdComment,isOcp)
        }

	for (const element of fields) {
           
           if(element.id==3){
            TicketsValues.create({
                    IdTicket:ticket.IdTicket,
                    IdField:element.id,
                    value: element.value,
                    createdAt : new Date(),
                    updatedAt: new Date()
                });
                 const loc = await Mexico.findAll({where:
            {c_mnpio:106,id_asenta_cpcons:element.value},
            attributes:['id_asenta_cpcons','d_asenta','d_codigo']});
                    
            const d = await Delegaciones.findOne({where:{colonia:{[Op.like]: `%${loc[0].d_asenta}%`}}});
             if(d){ 
            const t = await TolDelegaciones.findOne({where:{name:{[Op.like]: `%${d.delegacion}%`}}});
            const tt = await TicketsValues.findOne({where:{IdTicket:ticket.IdTicket,IdField:18}});
             
            if(!tt){
                        TicketsValues.create({
                            IdTicket:ticket.IdTicket,
                            IdField:18,
                            value: t ? t.id : null,
                            createdAt : new Date(),
                            updatedAt: new Date()
                        });
            }

                 console.log('Ticket 18',t);
            }
           
                ticket.id_asenta_cpcons = element.value;
                ticket.save();
            }else if(element.id==18){
               const t = await TicketsValues.findOne({where:{IdTicket:ticket.IdTicket,IdField:element.id}});
               console.log('Ticket 18',t);
               
               if(!t){
                TicketsValues.create({
                    IdTicket:ticket.IdTicket,
                    IdField:element.id,
                    value: element.value,
                    createdAt : new Date(),
                    updatedAt: new Date()
                });
               }
            }
            else{
                TicketsValues.create({
                    IdTicket:ticket.IdTicket,
                    IdField:element.id,
                    value: element.value,
                    createdAt : new Date(),
                    updatedAt: new Date()
                });
            }
            
        }

        if(IdChannel==6){
            let mcinfo = {
                IdTicket:ticket.IdTicket,
                IdArea:IdArea
            }
            createMcId(mcinfo);
        }

        res.status(200).json({
            status: true,
            data: ticket.IdTicket
        });
        
        sendEmailNew(IdApplicant,ticket.IdTicket)
        
        await Transactions.create({
            Tipo:'Creación Ticket',
            IdTicket:ticket.IdTicket,
            IdUser:req.user_id,
            values:JSON.stringify(ticket),
            createdAt : new Date(),
            updatedAt: new Date()
        });

        
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:`Error, can't create ticket: ${error}`,
        });
    }
}

async function saveAttachment (data,commentId,ocp){
    let purl;
    if(ocp){
        purl = process.env.URL_UPLOADSOCP
    }else{
        purl = process.env.URL_UPLOADS
    }
    try {
          await Promise.all(data.map(async (item)=>{
            const _comment = await Attachments.create({
                IdComment:commentId,
                fileName: item,
                url:purl+item
            });
            _comment.save();
          }))
    } catch (error) {
        console.log(error)
    }
}

const updateTicketByNumber = async(req,res = response)=>{
    
    const idTicket = req.body.IdTicket;
    const _ticket = req.body.ticket;
    const _ticketValues = req.body.values;
    const comment = req.body.comment.editorData;
    const attachments = req.body.attachments;
    console.log(attachments)
    console.log('USERSs'+_ticket.IdUser);
    try {
        const ticket = await Tickets.findOne({
            where:{IdTicket:idTicket}
        })
        if(ticket){
            ticket.IdPriority = _ticket.IdPriority,
            ticket.IdChannel= _ticket.IdChannel,
            ticket.IdStatus= _ticket.IdStatus,
            ticket.IdRequest =_ticket.IdRequest,
            ticket.IdForm = _ticket.IdForm,
            ticket.IdUser = _ticket.IdUser,
            ticket.IdGroup = _ticket.IdGroup,
            ticket.IdArea = _ticket.IdArea,
            ticket.IdUser = _ticket.IdUser,
            ticket.updatedAt = new Date()
            ticket.save();
        }
        let isOcp=false;
            for await(let i of _ticketValues){
                if(i.id==9){
                    isOcp = true;
                    console.log('isOcp');
                }
            }
        if(comment){
            const _comment = await Comments.create({
                IdAuthor : req.user_id,
                body : comment,
                createdAt:new Date(),
                updatedAt:new Date(),
                IdChannel: ticket.IdChannel,
                IdTicket:ticket.IdTicket,
                authorType:'Team'
            });
            _comment.save();
            console.log('entro Attach')
            attachments ? 
            saveAttachment(attachments,_comment.IdComment,isOcp) :null;
            let cm = {};
            cm.comment = comment,
            cm.date = moment(new Date()).format('LLL')
            const applEmail = await Applicants.findOne({where:{IdApplicant:ticket.IdApplicant}})
            console.log('ENTRORRMEILAS')
           let sm = await sendEMail(2,ticket.IdTicket,cm,applEmail.email);
        }
        if(!comment && attachments){
            const _comment = await Comments.create({
                IdAuthor : req.user_id,
                body : '',
                createdAt:new Date(),
                updatedAt:new Date(),
                IdChannel: ticket.IdChannel,
                IdTicket:ticket.IdTicket,
                authorType:'Team'
            });
            _comment.save();
            console.log('entro sin comments')
            saveAttachment(attachments,_comment.IdComment,isOcp)
        }
        console.log('fin update')
            
            _ticketValues.forEach(async item=>{
            let valTicket = await TicketsValues.findOne({
                where:{IdTicket:ticket.IdTicket,IdField:item.id}
            });
            if(valTicket){
                valTicket.value =item.value;
            valTicket.updatedAt =new Date();
            valTicket.save();
            }else{
                let newValue = await TicketsValues.create({
                    IdTicket:ticket.IdTicket,
                    IdField:item.id,
                    value:item.value,
                    createdAt:new Date(),
                    updatedAt:new Date()
                });
                newValue.save();
            }
            
            })
            res.status(200).json({
                status: true,
                data: ticket.IdTicket
            });

            await Transactions.create({
                Tipo:'Actualización de Ticket',
                IdTicket:ticket.IdTicket,
                IdUser:req.user_id,
                values:JSON.stringify(ticket),
                createdAt : new Date(),
                updatedAt: new Date()
            });
          
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:`Error, can't create ticket: ${error}`,
        });
    }
}

const createNewApplicant = async(data)=>{
    const {firstName, lastName, lastName2, email, phone} = data;

    try {
        const existsEmail = await Applicants.findOne({where:{email:email}});
        if(existsEmail){
            return existsEmail.IdApplicant;
        }
        const existsPhone = await Applicants.findOne({where:{email:email}});
        if(existsPhone){
            return existsPhone.IdApplicant;
        }  
        const applicant = Applicants.create({
            firstName: firstName,
            lastName : lastName,
            lastName2 : lastName2,
            email : email,
            phone : phone,
            createdAt : new Date(),
            updatedAt : new Date()
        });
        if(applicant){
            return applicant.IdApplicant;
        }else{
            return null;
        }
    } catch (error) {
        return null;
    }
}

const getTicketByNumber = async(req,res = response)=>{
    const nticket = req.body.ticket;

    try {

            const ticket = await Tickets.findOne({
                where: {
                    IdTicket:nticket
                },
                include: [
                    { model:TicketsValues,include: [{model:Fields}]
                    },
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants,include: [{model:ApplicantMobile}]
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User,
                    },
                    { model: mcidentifier,
                    },
                    
                ]
            })
        res.status(200).json({
            status: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}

const getFieldsByForm = async(req,res = response)=>{
    const IdForm = req.body.IdForm;
    try {
        const fields = await Fields.findAll({where:{IdForm:IdForm},
        include:{model:FieldsTypes}});

        res.status(200).json({
            status: true,
            data: fields
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}
//17 de Marzo
const getTicketsByArea = async(req,res = response)=>{
    const IdUser = req.user_id;
    const areas = req.body.areas;
    let status = req.body.status;

    let page=null;
    let offset = 0;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 10; 
    }
    if(!status){
        status = [1,2,3,4]
    }
    
    try {
            const areasuser = await User.findAll({
                where: {
                    IdUser:IdUser
                },  include: [
                    { model:Areas}
                ]
            });
            let q = areas;
            


            const ticket = await Tickets.findAndCountAll({distinct: true,limit:10,offset:offset, order:[['createdAt','DESC']],
                where:{
                    [Op.or]:[{IdArea:q},
                        {IdUser:IdUser}],IdStatus:status
                },
                include: [
                    //{ model:TicketsValues,include: [{model:Fields}]
                    //},
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants,
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User,
                    }
                   
                ]
            })
        res.status(200).json({
            status: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}

const getTicketsByUser = async(req,res = response)=>{
    const IdUser = req.user_id;
    const status = req.body.status;

    let q = {IdUser:IdUser};
    if(status){
        q  = {IdUser:IdUser,IdStatus:status}
    }
    let page=null;
    let offset = 0;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 10; 
    }
    
    try {

        const ticket = await Tickets.findAndCountAll({distinct: true,limit:10,offset:offset, order:[['createdAt','DESC']],
                where:q,
                include: [
                    { model:TicketsValues,include: [{model:Fields}]
                    },
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants,
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User,
                    }
                   
                ]
            })
        res.status(200).json({
            status: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}

const getTicketsByApplicant = async(req,res = response)=>{
    const {IdApplicant} = req.body.applicant;
    //const status = req.body.status;
    let page=null;
    let offset = 0;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 10; 
    }
    
    try {

        const ticket = await Tickets.findAndCountAll({distinct: true,order:[['createdAt','DESC']],
                where:{IdApplicant:IdApplicant},
                include: [
                    { model:TicketsValues,include: [{model:Fields}]
                    },
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants,
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User,
                    }
                   
                ]
            })
        res.status(200).json({
            status: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}


const searchAdvanceTickets = async(req,res = response)=>{
    const areas = req.body.areas;
    const qstatus = req.body.status;
    const requests = req.body.requests;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const channel = req.body.channel;
    let mc =  req.body.mc;
    let tel = req.body.tel ? req.body.tel : null

    console.log('mccccccc'+mc)
    //const searchTerm = req.body.search;
    let searchTerm = req.body.search;
    let _qt = null;
    let qtick =  [];
    let tick = parseInt(searchTerm);
    
    if(tick){
        qtick = [{IdTicket:tick}]
    }else{
        if(searchTerm || tel){

            searchTerm = `%${searchTerm}%`;
            _qt = {
                fullName:{
                    [Op.like]:`${searchTerm}`
                },
                phone:{
                    [Op.like]:`%${tel ? tel : ''}%`
                }
            }
        }
    }

    let query =  [];

    let _qa = {[Op.or]:areas} 
    let _qs = {[Op.or]:qstatus}
    let _qr = {[Op.or]:requests}
    let _qc = {[Op.or]:channel}
    let _qtt = {[Op.or]:qtick}
    //let _qtel = {[Op.like]:`%${tel ? tel : ''}%`}


    areas.length>0 ?  query.push(_qa) : null;
    qstatus.length>0 ?  query.push(_qs) : null;
    requests.length>0 ?  query.push(_qr) : null;
    channel.length>0 ?  query.push(_qc) : null;
    channel.length>0 ?  query.push(_qc) : null;
    qtick.length>0 ?  query.push(_qtt) : null;
    mc ? query.push({IdUser:mc}) : null;
    //_qtel ? query.push({phone:_qtel}) : null;

    let page=null;
    let offset = 0;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 20; 
    }
    let ocp = {IdField:'9',value:'1'}

    try {
        ///console.log(query)
        let result = '';
        if(query.length>0){
            console.log(`Con QUERYssss
                        ..........
                        ${query.length}`);
             result = await Tickets.findAndCountAll({distinct: true,limit:20,offset:offset,order:[['createdAt','DESC']],
                where:{
                   // sIdUser:mc,
                    createdAt: {
                        [Op.lt]: endDate,
                        [Op.gt]: startDate
                      },
                    [Op.and]:[ ///Por Columna
                        query
                    ]
                },
                include: [
                   { model:TicketsValues,include: [
                        {model:Fields}
                    ]
                    },
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants,where:_qt
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User,
                    }
                   
                ]
            });

        }else{
             result = await Tickets.findAndCountAll({distinct: true,
                where:{
                    //IdUser:mc,
                    createdAt: {
                        [Op.lt]: endDate,
                        [Op.gt]: startDate
                      },
                },
                include: [
                    { model:TicketsValues,include: [{model:Fields}]
                    }, 
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants,where:
                            {firstName:{
                                [Op.like]:'%%'
                            }}
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User,
                    }
                   
                ]
            });
        }
       /*  let fr = []
        for await(let item of result.rows){
            let tv = await TicketsValues.findAll({where:{IdTicket:item.dataValues.IdTicket},raw:true,nest:true,include:[{model:Fields}]});
            item.ticketsValues = tv;
            fr.push(tv);
        }
        
        const datos =await makeExportData(fr);

        console.log(datos)
        let back = {rows:result.rows,count:result.count,values:datos}
        
        res.status(200).json({
            status: true,
            data: back
        }); */

       //console.log(result.rows[10]);
       //console.log('llego')
       /*  const datos =await makeExportData(result.rows);
        let back = {rows:datos,count:result.count} */
        const datos =await makeExportData(result.rows)
        res.status(200).json({
            status: true,
            data: {rows:datos,count:result.count}
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}

const searchOcp = async(req,res = response)=>{

    let ocp = req.body.ocp;

    try {
    
        let result = await Tickets.findAndCountAll({distinct: true,
                include: [
                    { model:TicketsValues,where:{IdField:9,value:ocp},include: [{model:Fields}]
                    }, 
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User
                    }
                   
                ]
            });

        const datos =await makeExportData(result.rows)
        res.status(200).json({
            status: true,
            data: {rows:datos,count:result.count}
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}

async function makeExportData(ticketsData){
    //console.log(ticketsData)
    try {
        let arr = [];
    for await(var f of ticketsData){
        
        await Promise.all(
            f.ticketsValues.map(async (item)=>{
                if(item.IdField==3 ){

                const loc = await Mexico.findAll({where:
                    {c_mnpio:106,id_asenta_cpcons:item.value},
                    attributes:['id_asenta_cpcons','d_asenta','d_codigo']});
                    if(loc.length>0){
                         return f.dataValues[item.field.slug] = loc[0].d_asenta;
                      }
                  
      
                }
                return f.dataValues[item.field.slug] = item.value;
              })
        );
              
        arr.push(f);
    }
    return arr;
    } catch (error) {
        console.log(error)
    }
}
/* async function makeExportData(ticketsData){
    console.log('export')
    let arr = [];
    for await(var f of ticketsData){
        ///console.log(f);
        await Promise.all(
            f.map(async (item)=>{
                if(item.IdField==3 ){
                    console.log(item);
                    
                  const loc = await Mexico.findAll({where:
                      {c_mnpio:13,id_asenta_cpcons:parseInt(item.value)},
                      attributes:['id_asenta_cpcons','d_asenta','d_codigo']});
                      if(loc.length>0){
                           return f[item.field.slug] = loc[0].d_asenta;
                        }
      
                }
                return f[item.field.slug] = item.value;
              })
        );  
        arr.push(f);
    }
    return arr;
} */
const exportAdvanceTickets = async(req,res = response)=>{
    const areas = req.body.areas;
    const qstatus = req.body.status;
    const requests = req.body.requests;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const channel = req.body.channel;
    const cols = req.body.cols;
    //const searchTerm = req.body.search;
    let searchTerm = req.body.search;
    let _qt = null;
    if(searchTerm){
        searchTerm = `%${searchTerm}%`;
        _qt = {
            fullName:{
                [Op.like]:`${searchTerm}`
            }
        }
    }

    let query =  [];

    let _qa = {[Op.or]:areas} 
    let _qs = {[Op.or]:qstatus}
    let _qr = {[Op.or]:requests}
    let _qc = {[Op.or]:channel}

    areas.length>0 ?  query.push(_qa) : null;
    qstatus.length>0 ?  query.push(_qs) : null;
    requests.length>0 ?  query.push(_qr) : null;
    channel.length>0 ?  query.push(_qc) : null;
    
    let page=null;
    let offset = 0;
    if(req.body.page){
     page = req.body.page;
     page = parseInt(page) - 1;
     offset = page * 20; 
    }
    

    try {
        console.log(query)
        let result = '';
        if(query.length>0){
            console.log(`Con QUERY
                        ..........
                        ${query.length}`);
             result = await Tickets.findAndCountAll({distinct: true,offset:offset,order:[['createdAt','DESC']],
                where:{
                    createdAt: {
                        [Op.lt]: endDate,
                        [Op.gt]: startDate
                      },
                    [Op.and]:[ ///Por Columna
                        query
                    ]
                },
                include: [
                    { model:TicketsValues,include: [
                        {model:Fields}
                    ]
                    },
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants,where:_qt
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User,
                    }
                   
                ]
            });
        }else{
             result = await Tickets.findAndCountAll({distinct: true,
                where:{
                    createdAt: {
                        [Op.lt]: endDate,
                        [Op.gt]: startDate
                      },
                },
                include: [
                    { model:TicketsValues,include: [{model:Fields}]
                    },
                    { model: Requests,
                    },
                    { model: RequestsGroup,
                    },
                    { model: Applicants,where:
                            {firstName:{
                                [Op.like]:'%%'
                            }}
                    },
                    { model: Areas,
                    },
                    { model: Channel,
                    },
                    { model: Priority,
                    },
                    { model: Status,
                    },
                    { model: User,
                    }
                   
                ]
            });
        }
        console.log('TESTs')
        const datos =await exportData(result.rows,cols);
        console.log('TESTs')
        res.status(200).json({
            status: true,
            data: datos
        });

    } catch (error) {
        
    }
}

async function exportData(ticketsData,cols){
try {
    let dataExport = [];

    for await(var f of ticketsData){
        let items = {};
        items.Ticket = f.IdTicket;
        items.Status = f.status.name;

        
        cols.applicant ? 
        items.Solicitante = `${f.applicant.firstName} ${f.applicant.lastName} ${f.applicant.lastName2}` : null;
        
        cols.request ? 
        items.Solicitud = f.request ? f.request.name : '' : null;
	
        cols.createdAt ? 
        items.Recibido = moment(f.createdAt).utcOffset('-06:00').format('YYYY-MM-DD HH:mm:ss') : null;
        
        cols.updatedAt ? 
        items.Actualizado = moment(f.updatedAt).utcOffset('-06:00').format('YYYY-MM-DD HH:mm:ss') : null;

        cols.group ?
        items.Direccion_Municipal = f.requestGroup.name : null;

        cols.priority ? 
        items.Prioridad = f.priority.name : null;

        cols.channel ? 
        items.Canal = f.channel.name : null;

        cols.phone ? 
        items.Telefono = f.applicant.phone : null;

        cols.email ?
        items.Email = f.applicant.email : null;

        f.ticketsValues.sort(function(a,b){
            return a.IdField - b.IdField;
        })

        await Promise.all(
            f.ticketsValues.map(async (item)=>{
                item.IdField==1 && cols.observations ?  items[item.field.name] = item.value: null;
                item.IdField==2 && cols.street ?  items[item.field.name] = item.value: null;
                

                if(item.IdField==3 && cols.locality){
                    if(item.value){
                        let d = item.value.includes('locality:');
                                
                    if(d){
                
                            let f = item.value.replace(/[|&;$%@":,<>()}+,]/g, ' ');
                            let g = f.split('  ');
                            let colonias = {};
                            colonias.sublocality = g[3];
                            colonias.locality = g[1];
        
                    
                            if(colonias.sublocality == '(null)' || colonias.sublocality=='' || colonias.sublocality==null){
                                return items[item.field.name] = colonias.locality
                            }else{
                                return items[item.field.name] = colonias.sublocality
                            }



                        
                }else{
                    const loc = await Mexico.findAll({where:
                        {c_mnpio:106,id_asenta_cpcons:item.value},
                        attributes:['id_asenta_cpcons','d_asenta','d_codigo']});
                        if(loc.length>0){
                            return items[item.field.name] = loc[0].d_asenta;
                          }
        
                }
                    }
  
                 
                }
                item.IdField==4 && cols.postal ?  items[item.field.name] = item.value: null;
                item.IdField==7 && cols.coordinates ?  items[item.field.name] = item.value: null;
		
		if (item.IdField == 14 && cols.comentarios) {
                        items[item.field.name] = getCatalogValue('comentarios', parseInt(item.value));
                    }
		if (item.IdField == 15 && cols.material) {
                        items[item.field.name] = getCatalogValue('material', parseInt(item.value));
                    }

                    // ✅ Campo trabajo (IdField = 16)
                    if (item.IdField == 16 && cols.trabajo) {
                        items[item.field.name] = getCatalogValue('trabajo', parseInt(item.value));
                    }

                    // ✅ Campo seguimiento (IdField = 17)
                    if (item.IdField == 17 && cols.seguimiento) {
                        items[item.field.name] = getCatalogValue('seguimiento', parseInt(item.value));
                    }

                    // ✅ Campo delegacion (IdField = 18) - NUEVO
                    if (item.IdField == 18 && cols.delegacion) {
                        items[item.field.name] = getCatalogValue('delegacion', parseInt(item.value));
                    }

              })
        );
        dataExport.push(items);
    }
    return dataExport;
} catch (error) {
    console.log(error)
}

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
const updateDate = async(req,res = response)=>{
    try {
        const tickets = await Tickets.findAll();
        
       /* if(tickets){
            tickets.forEach(async (t)=>{
                ///console.log(t.dataValues.IdTicket);
                let nd = t.dataValues.createdAt;
                //console.log(nd);
                let nn = moment(nd)
                ///console.log(nn);
                let ndd = moment(nn).add(5,'hours')
                ///console.log(ndd);
                await Tickets.update({
            createdAt:ndd.format('YYYY-MM-DD HH:mm:ss')
        },{
            where:{IdTicket:t.dataValues.IdTicket}
        })
            });
        };*/
      

    } catch (error) {
        console.log(error);
    }
}
const deleteTicketsWhereCondition = async(req,res = response)=>{
    const tickets = req.body.tickets; 
    try {
        TicketsValues.destroy({where:{IdTicket:tickets}}).then((data)=>{
            mcidentifier.destroy({where:{IdTicket:tickets}}).then((d)=>{
                Tickets.destroy({where:{IdTicket:tickets}}).then(()=>{
                    res.status(200).json({
                        status: true,
                        data: 'Deleted'
                    });
                })
            })


           
        })
    } catch (error) {
        res.status(500).json({
            status: true,
            msg: 'Error'+error
        });
    }
}


const createMcId = async(data)=>{
    
    let lastmc = await mcidentifier.findOne({
        where:{IdArea:data.IdArea},
        order:[['createdAt','DESC']]
    });
    let mcc = 0;

    if(lastmc){
        mcc = lastmc.IdMc;
        mcc++;
    }else{
        mcc=1;
    }

    try {

        let mcId = await mcidentifier.create({
            IdTicket:data.IdTicket,
            IdArea:data.IdArea,
            IdMc:mcc,
            createdAt:new Date(),
            updatedAt:new Date()
        })
        mcId.save();

        
    } catch (error) {
        
    }
}

const trackinEvents= async(userid,ticket,_ticket,values)=>{
    
    try {
        if(ticket.IdPriority == _ticket.IdPriority){
            
        }
        if(ticket.IdChannel== _ticket.IdChannel){

        }
        if(ticket.IdStatus= _ticket.IdStatus){

        }
        if(ticket.IdRequest ==_ticket.IdRequest){

        }
        if(ticket.IdUser == _ticket.IdUser){

        }
        if(ticket.IdGroup = _ticket.IdGroup){
            
        }
        if(ticket.IdUser = _ticket.IdUser){

        }
        

    } catch (error) {
        
    }
}


// 17 de marzo
const reassignTicketByNumber = async(req,res = response)=>{
    const ticket = req.body.ticket;
    try {

        const _ticket = await Tickets.findOne({
            where:{IdTicket:ticket.IdTicket}
        })
        _ticket.IdUser = ticket.IdUser;
        _ticket.IdArea = ticket.IdArea;
        _ticket.IdRequest = ticket.IdRequest;
        _ticket.IdGroup = ticket.IdRequestGroup;
        _ticket.save();
        await Transactions.create({
            Tipo:'Reasignación Ticket',
            IdTicket:ticket.IdTicket,
            IdUser:req.user_id,
            values:JSON.stringify(ticket),
            createdAt : new Date(),
            updatedAt: new Date()
        });


        res.status(200).json({
            status: true,
            data: _ticket
        });
       

    } catch (error) {
        res.status(500).json({
            status: true,
            msg: 'Error'+error
        });
    }
}

const getCustomValues= async(req,res = response)=>{

    try {
        const customValue = req.body.custom;
        const customValues = await Custom.findAll({
            
        });
         res.status(200).json({
            status: true,
            data: customValues
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}

const getDelegaciones= async(req,res = response)=>{

    try {

        const delegacioes = await TolDelegaciones.findAll({});
         res.status(200).json({
            status: true,
            data: delegacioes
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            data: error
        });
    }
}

const getTicketsWithSurveyResults = async (req, res = response) => {
    try {
        const {
            startDate,
            endDate,
            status, // 'sent', 'completed', 'expired', 'in_progress'
            page = 1,
            limit = 50,
            searchText
        } = req.body;

        // Validar parámetros requeridos
        if (!startDate || !endDate) {
            return res.status(400).json({
                status: false,
                message: 'startDate y endDate son requeridos'
            });
        }

        // Agregar horarios específicos a las fechas
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0); // 00:00:00

        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // 23:59:59

        // Calcular offset para paginación
        const offset = (page - 1) * limit;

        // Construir filtros WHERE
         const whereConditions = {};
        if (searchText && searchText.trim() !== '') {
            // Verificar si es un número (ID de ticket) o texto
            const ticketId = parseInt(searchText);
            if (!isNaN(ticketId)) {
                whereConditions.IdTicket = ticketId;
            } else {
                // Si no es número, buscar en otros campos relacionados
                whereConditions.IdTicket = { [Op.like]: `%${searchText.trim()}%` };
            }
        }

        // Filtro para SurveyResponse
        const surveyResponseWhere = {
             createdAt: {
                [Op.between]: [startDateTime, endDateTime]
            }
        };
        if (status.length > 0) {
            surveyResponseWhere.status = { [Op.in]: status };
        }

        // Consulta principal
        const tickets = await Tickets.findAndCountAll({
            where: whereConditions,
            attributes: [
                'IdTicket',
                'IdRequest',
                'IdGroup',
                'createdAt',
                'IdStatus',
                'IdApplicant'
            ],
            include: [
                {
                    model: SurveyResponse,
                    as: 'surveyResponses',
                    attributes: [
                        'IdSurveyResponse',
                        'IdSurvey',
                        'status',
                        'completedAt',
                        'createdAt',
                        'responseData',
                        'sentAt',
                        'totalSentCount'
                    ],
                    where: surveyResponseWhere,
                    required: true, // INNER JOIN - solo tickets con survey responses
                    include: [
                        {
                            model: Survey,
                            as: 'survey',
                            attributes: ['IdSurvey', 'name', 'surveyType']
                        }
                    ]
                },
                {
                    model: Status,
                    attributes: ['IdStatus', 'name'],
                    required: false
                },
                {
                    model: Requests,
                    attributes: ['IdRequest', 'name'],
                    required: false
                },
                {
                    model: RequestsGroup,
                    attributes: ['IdRequestGroup', 'name'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true // Para contar correctamente con JOINs
        });

        // Calcular información de paginación
        const totalPages = Math.ceil(tickets.count / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        // Procesar datos para incluir información resumida
        const processedTickets = tickets.rows.map(ticket => {
            const ticketData = ticket.toJSON();
            
            // Agregar información resumida de surveys
            if (ticketData.surveyResponses && ticketData.surveyResponses.length > 0) {
                ticketData.surveysSummary = {
                    total: ticketData.surveyResponses.length,
                    completed: ticketData.surveyResponses.filter(sr => sr.status === 'completed').length,
                    pending: ticketData.surveyResponses.filter(sr => sr.status === 'sent').length,
                    expired: ticketData.surveyResponses.filter(sr => sr.status === 'expired').length
                };
            }

            return ticketData;
        });

        res.status(200).json({
            status: true,
            data: {
                tickets: processedTickets,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalItems: tickets.count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: hasNextPage,
                    hasPreviousPage: hasPreviousPage
                },
                filters: {
                    startDate: startDateTime.toISOString(),
                    endDate: endDateTime.toISOString(),
                    surveyStatus: status || 'all'
                }
            }
        });

    } catch (error) {
        console.error('Error en getTicketsWithSurveyResults:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener tickets con resultados de encuestas',
            error: error.message
        });
    }
};

// Función adicional para obtener estadísticas generales
// Función adicional para obtener estadísticas generales
const getSurveyResultsStats = async (req, res = response) => {
    try {
        const {
            startDate,
            endDate,
            surveyStatus
        } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                status: false,
                message: 'startDate y endDate son requeridos'
            });
        }

        // Agregar horarios específicos a las fechas
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0); // 00:00:00

        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // 23:59:59

        // Obtener estadísticas generales
        const stats = await SurveyResponse.findAll({
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('IdSurveyResponse')), 'count']
            ],
            include: [
                {
                    model: Tickets,
                    as: 'ticket',
                    where: {
                        createdAt: {
                            [Op.between]: [startDateTime, endDateTime]
                        }
                    },
                    attributes: []
                }
            ],
            where: surveyStatus ? { status: surveyStatus } : {},
            group: ['status'],
            raw: true
        });

        // Obtener estadísticas por tipo de encuesta
        const surveyTypeStats = await SurveyResponse.findAll({
            attributes: [
                [Sequelize.col('survey.surveyType'), 'surveyType'],
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('SurveyResponse.IdSurveyResponse')), 'count']
            ],
            include: [
                {
                    model: Survey,
                    as: 'survey',
                    attributes: []
                },
                {
                    model: Tickets,
                    as: 'ticket',
                    where: {
                        createdAt: {
                            [Op.between]: [startDateTime, endDateTime]
                        }
                    },
                    attributes: []
                }
            ],
            where: surveyStatus ? { status: surveyStatus } : {},
            group: ['survey.surveyType', 'status'],
            raw: true
        });

        res.status(200).json({
            status: true,
            data: {
                generalStats: stats,
                surveyTypeStats: surveyTypeStats,
                period: {
                    startDate: startDateTime.toISOString(),
                    endDate: endDateTime.toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Error en getSurveyResultsStats:', error);
        res.status(500).json({
            status: false,
            message: 'Error al obtener estadísticas de encuestas',
            error: error.message
        });
    }
};

module.exports= {
    createNewTicket, getTicketByNumber, getFieldsByForm, updateTicketByNumber, getTicketsByArea, getTicketsByUser, getTicketsByApplicant, searchAdvanceTickets, exportAdvanceTickets, updateDate, deleteTicketsWhereCondition, searchOcp, reassignTicketByNumber, getCustomValues, getDelegaciones, getTicketsWithSurveyResults, getSurveyResultsStats
}
