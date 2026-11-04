const {response} = require('express');
const Tickets = require('../model/tickets');
const { Op, Sequelize } = require("sequelize");
const {dateSeries} = require('../helpers/dates')
const moment = require('moment');
const Areas = require('../model/areas');
const RequestsGroup = require('../model/requestGroup');
const Channel = require('../model/channels');

const ticketsByDate = async(req,res = response)=>{
    const startDate =  req.body.startDate;
    const endDate =  req.body.endDate;
    const areas = req.body.areas;
    const IdUser= req.user_id;

    const xaxis = await dateSeries(startDate,endDate);
    let labels = [];

   let series = [{
        name: 'Tickets',
        data: []
    }];
    let q = areas;
    console.log(q);
    try {
        Promise.all(
            xaxis.map(async (date)=>{
		let end = moment(date).hours(23).minutes(59).seconds(59);
                let start = moment(date).hours(00).minutes(00).seconds(00);
		end =  end.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')
		start = start.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')
		console.log('END Promise', end);
		console.log('START Promise', start);
      let results = await Tickets.count({
                    where:{createdAt:{
                        [Op.lt]: end,
                        [Op.gt]: start
                    },[Op.or]:[{IdArea:q},{IdUser:IdUser}]}
                });
                series[0].data.push(results);
                labels.push(moment(date).format('ll'))
            })
        ).then(()=>{
            res.status(200).json({
                status: true,
                series: series,
                xaxis:labels
            });
        })

        

    } catch (error) {
        res.status(500).json({
            status: true,
            data: error
        });
    }
}
// 17 de marzo
const ticketsByDateAndAllStatus = async(req,res = response)=>{
    const startDate =  req.body.startDate;
    const endDate =  req.body.endDate;
    const areas = req.body.areas;
    const IdUser = req.user_id;

    const xaxis = await dateSeries(startDate,endDate);
    let resultsArray = [];
    const statusArray = [{IdStatus:1},{IdStatus:2},{IdStatus:3},{IdStatus:4}];
    let q = areas;
    try {

        Promise.all(
            statusArray.map(async (s)=>{
                var arr = [];
                let item = {name:'',data:[]};
                s.IdStatus==1 ? item.name ='Abierto':null;
                s.IdStatus==2 ? item.name ='Pendiente':null;
                s.IdStatus==3 ? item.name ='Resuelto':null;
                s.IdStatus==4 ? item.name ='Cancelado':null;
                for await(let date of xaxis){
                    let end = moment(endDate).hours(23).minutes(59).seconds(59);
                     let start = moment(startDate).hours(0).minutes(0).seconds(0);
                	end =  end.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')
                start = start.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')    
		let results = await Tickets.count({
                        where:{createdAt:{
                            [Op.lt]: end,
                            [Op.gt]: start
                        },[Op.or]:[{IdArea:q},{IdUser:IdUser}],
                        [Op.and]:[[
                            s
                        ]]}
                    });
                    item.data.push(results);   
                }
                resultsArray.push(item);
                
            })  
        ).then(()=>{
            res.status(200).json({
                status: true,
                data: resultsArray,
                xaxis:xaxis
            });
        })

        
    } catch (error) {

        res.status(500).json({
            status: true,
            data: error
        });
        
    }

}
///17 Marzo
const totalTicketsByStatus = async(req,res = response)=>{
    
    const startDate =  req.body.startDate;
    const endDate =  req.body.endDate;
    const areas = req.body.areas;
    const IdUser = req.user_id;
    let resultsArray = [];
    const statusArray = [{IdStatus:1},{IdStatus:2},{IdStatus:3},{IdStatus:4}];
    let q =areas;
    console.log(q);
    try {
            var labels = [];
            var data = [];
               Promise.all(
                statusArray.map(async (s)=>{
                
		let end = moment(endDate).hours(23).minutes(59).seconds(59);
                     let start = moment(startDate).hours(0).minutes(0).seconds(0);
                        end =  end.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')
                start = start.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')    

                let results = await Tickets.count({
                   where:{createdAt:{
                       [Op.lt]: end,
                       [Op.gt]: start,
                   },[Op.or]:[{IdArea:q},{IdUser:IdUser}],
                   [Op.and]:[[
                       {IdStatus:s.IdStatus}
                   ]]}
               });
                s.IdStatus==1 ? labels.push('Abierto')  :null;
                s.IdStatus==2 ? labels.push('Pendiente') :null;
                s.IdStatus==3 ? labels.push('Resuelto') :null;
                s.IdStatus==4 ? labels.push('Cancelado') :null;
                data.push(results);   
                
            })  
        ).then(()=>{
            res.status(200).json({
                status: true,
                data: data,
                labels:labels
            });
        })
    } catch (error) {
        res.status(500).json({
            status: true,
            data: error
        });
    }
}
// 17 de marzo
const totalAreasByUsersStatus = async(req,res = response)=>{
    const startDate =  req.body.startDate;
    const endDate =  req.body.endDate;
    const areas = req.body.areas;
    const statusArray = [{IdStatus:1},{IdStatus:2},{IdStatus:3},{IdStatus:4}];
    let labels = [];
    try {
        Promise.all(
            areas.map(async(i)=>{
                let lbl = await Areas.findOne({order:[['name','ASC']],
                    where:{IdArea:i},
                    include:[{model:RequestsGroup,attributes:['IdRequestGroup','name']}]
                });

                lbl.dataValues.requestGroups.length ? 
                labels.push(lbl) : null;
            })
        ).then(async()=>{
            labels.sort((a,b)=>{
                return a.dataValues.name.localeCompare(b.dataValues.name);
            })
           let ser =[];
            for await(let s of statusArray){
                let serData ={name:'',data:[]};
                for await(let r of labels){
			let end = moment(endDate).hours(23).minutes(59).seconds(59);
                     let start = moment(startDate).hours(0).minutes(0).seconds(0);
                        end =  end.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')
                start = start.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')    

                    let results = await Tickets.count({
                        where:{createdAt:{
                            [Op.lt]: end,
                            [Op.gt]: start,
                        },IdArea:r.dataValues.IdArea,IdStatus:s.IdStatus}
                    });
                    if(s.IdStatus==1){
                        serData.name = 'Abierto';
                        serData.data.push(results);
                    }
                    if(s.IdStatus==2){
                        serData.name = 'Pendiente';
                        serData.data.push(results);
                    }
                    if(s.IdStatus==3){
                        serData.name = 'Resuelto';
                        serData.data.push(results);
                    }
                    if(s.IdStatus==4){
                        serData.name = 'Cancelado';
                        serData.data.push(results);
                    }
                }
                ser.push(serData);
            }
          
                res.status(200).json({
                    status: true,
                    data: ser,
                    labels:labels
                    });
        })
      
          

    } catch (error) {
        res.status(500).json({
            status: true,
            data: error
        });
    }

}

const totalAreasByUsers = async(req,res = response)=>{
    const startDate =  req.body.startDate;
    const endDate =  req.body.endDate;
    const areas = req.body.areas;
    const IdUser = req.user_id;

    let areasResults = [];
    let labels = [];
    try {
        Promise.all(
            areas.map(async(i)=>{
                let lbl = await Areas.findOne({
                    where:{IdArea:i},
                    include:[{model:RequestsGroup,attributes:['IdRequestGroup','name']}]
                });

                lbl.dataValues.requestGroups.length ? 
                labels.push(lbl) : null;
            })
        ).then(async()=>{
            labels.sort((a,b)=>{
                return a.dataValues.name.localeCompare(b.dataValues.name);
            })
            console.log(labels);
            for await(let r of labels){
		let end = moment(endDate).hours(23).minutes(59).seconds(59);
                     let start = moment(startDate).hours(0).minutes(0).seconds(0);
                        end =  end.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')
                start = start.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')    

                let results = await Tickets.count({
                    where:{createdAt:{
                        [Op.lt]: end,
                        [Op.gt]: start,
                    },IdArea:r.dataValues.IdArea}
                });
                areasResults.push(results);
            }
            
                res.status(200).json({
                    status: true,
                    data: areasResults,
                    labels:labels
                });
        })
      
          

    } catch (error) {
        res.status(500).json({
            status: true,
            data: error
        });
    }

}

const ticketsByChannel = async(req,res = response)=>{
    const startDate =  req.body.startDate;
    const endDate =  req.body.endDate;
    const areas = req.body.areas;
    const IdUser = req.user_id;

    const xaxis = await dateSeries(startDate,endDate);
    let resultsArray = [];
    const channelsArray = await Channel.findAll({order:[['name','ASC']],
        attributes:['IdChannel','name']
    });
    let q = areas;
    try {
        var labels = [];
        var data = [];
           Promise.all(
            channelsArray.map(async (s)=>{
		let end = moment(endDate).hours(23).minutes(59).seconds(59);
                     let start = moment(startDate).hours(0).minutes(0).seconds(0);
                        end =  end.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')
                start = start.utcOffset('+06:00').format('YYYY-MM-DD HH:mm:ss')    

            let results = await Tickets.count({
               where:{createdAt:{
                [Op.lt]: end,
                [Op.gt]: start,
               },[Op.or]:[{IdArea:q},{IdUser:IdUser}],
               [Op.and]:[[
                   {IdChannel:s.IdChannel}
               ]]}
           });
           labels.push(s.name);
            data.push(results);   
            
        })  
    ).then(()=>{
        res.status(200).json({
            status: true,
            data: data,
            labels:labels
        });
    })
} catch (error) {
    res.status(500).json({
        status: true,
        data: error
    });
}
}


module.exports = {
    ticketsByDate, ticketsByDateAndAllStatus, totalTicketsByStatus, totalAreasByUsers,totalAreasByUsersStatus, ticketsByChannel
}   
