const {response} = require('express');
const Applicants = require('../model/applicants');
const Areas = require('../model/areas');
const Comments = require('../model/comments');
const Users = require('../model/user');
const Attachments = require('../model/attachments');
var fs2 = require('fs');
const fs = require('fs').promises;
const path = require('path')
const Tickets = require('../model/tickets');
const TicketsValues = require('../model/ticketValues');
//var sharp = require('sharp');
//const Jimp = require('jimp');
const { Jimp } = require("jimp");
const gm = require('gm'); 

const getCommentsByTicket = async (req, res = response) =>{
    const ticketId = req.body.IdTicket;

    try {
        let comments = await Comments.findAll(
            {   
                where:{IdTicket:ticketId,authorType:'Team'},
                include:[
                    {model:Users,attributes:['firstName','lastName','email','IdArea'],
                    include: [
                        {model:Areas,attributes:['name','IdUser']}]}
                        ,{model:Attachments}]
            }
        );
        let commentsApp = await Comments.findAll(
            {   
                where:{IdTicket:ticketId,authorType:'Applicant'},
                include:[
                    {model:Applicants,attributes:['firstName','lastName','lastName2','email']},{model:Attachments}]
            }
        );
        console.log(commentsApp);
        let allComments = await comments.concat(commentsApp);
        allComments.sort((a,b)=>{
            return b.updatedAt - a.updatedAt;
        })

        res.status(200).json({
            status: true,
            data:allComments
        })
        
    } catch (error) {
        res.status(500).json({
            status: false,
            msg:'Error, no se puden recuperar los comentarios.' + error
        })
    }
}
const uploadAttachment = async (req, res = response) =>{

    const filesAttachments = req.files;

        try {
            let filesReturn = []
           
            /* await Promise.all(filesAttachments.map(async (file) => {
                let pathTemp = file.path;

                if(req.body.ocp){
                   let fileName = req.body.ocp;
                    let fileExt = file.mimetype.split('/').pop();
                    let now = 'oficialia';
                    let filePath = `/Users/ferson/documents/${now}/${fileName}.${fileExt}`;
                    let contents = await saveFilesOcp(filePath,fileName,fileExt,pathTemp)
                
                    filesReturn.push(`${fileName}.${fileExt}`);
                }else{
                    fileName = file.filename;
                    let fileExt = file.mimetype.split('/').pop();
                    let now = fileName;
                    let fileDir = `./uploads/${now}`;
                    let filePath = `./uploads/${now}/${fileName}.${fileExt}`;
                    let contents = await saveFiles(filePath,fileDir,pathTemp)
                
                    filesReturn.push(`${fileName}.${fileExt}`);
                }
              })); */
              
              for await(let file of filesAttachments){
                let pathTemp = file.path;
                let start = true;
                if(req.body.ocp){
                   let fileName = req.body.ocp;
                    let fileExt = file.mimetype.split('/').pop();
                    let now = 'oficialia';
                    //let fileDir = `/Users/ferson/documents/${now}`;
                    
                    //let filePath = `/mnt/volume_sfo2_01/oficialia/${now}/${fileName}.${fileExt}`;
                    let filePath = `/Users/ferson/documents/${now}/${fileName}.${fileExt}`;
                    let contents = await saveFilesOcp(filePath,fileName,fileExt,pathTemp)

                    filesReturn.push(contents.fileName);
                }else{
                    fileName = file.filename;
                    let fileExt = file.mimetype.split('/').pop();
                    let now = fileName;
                    let fileDir = `./uploads/${now}`;
                    let filePath = `./uploads/${now}/${fileName}.${fileExt}`;
                    let contents = await saveFiles(filePath,fileDir,pathTemp)
                
                    filesReturn.push(`${fileName}.${fileExt}`);
                }
              }
              console.log(filesReturn);

              res.status(200).json({
                status: true,
                data:filesReturn
            }) 
    } catch (error) {
     console.log(error)   
    }
}
const viewAttachment = async (req,res = response)=>{
     const tipo = req.query.path;
     const direct = tipo.split('.').slice(0, -1).join('.');
     //console.log(req)
    ///const file = req.params.file;
    console.log(tipo)
    const imagePath = path.join(__dirname,"../uploads/"+direct+'/'+tipo);
	//const imageStream = await fs.createReadStream(imagePath);   

	/*imageStream.on('error', (err) => {
        console.error('Error al leer la imagen:', err);
        res.status(500).send('Error al leer la imagen');
    });

    // Configurar el encabezado correcto para la imagen
    res.writeHead(200, {
        'Content-Type': 'image/jpeg', // Ajustar según el tipo de imagen
        'Content-Length': fs.statSync(pathImg).size // Agregar el tamaño del archivo (opcional)
    });

    // Pipe the read stream to the response
    imageStream.pipe(res);
*/

try {
        const stats = await fs.stat(imagePath); // Llamada asíncrona

        // Verificar tamaño del archivo (en bytes)
        const fileSizeInMegabytes = stats.size / (1024 * 1024); // Convertir tamaño a MB
        // Solo reducir tamaño si el archivo es mayor a 8 MB

	if (fileSizeInMegabytes > 8) {
            gm(imagePath)
                .identify((err, data) => {
                    if (err) {
                        console.error('Error identificando la imagen:', err);
                        return res.status(500).json({ message: 'La imagen está dañada y no se puede procesar.' });
                    }

                    // Si la imagen se identifica correctamente, simplemente la devolvemos
                    gm(imagePath)
                        .toBuffer('JPEG', (err, buffer) => {
                            if (err) {
                                console.error('Error al procesar la imagen:', err);
                                return res.status(500).json({ message: 'Error al procesar la imagen.' });
                            }

                            res.set('Content-Type', 'image/jpeg'); // Ajustar según el tipo de imagen
                            return res.send(buffer); // Enviar la imagen procesada
                        });
                });
        } else {
            // Si el archivo no es mayor a 8 MB, simplemente servir la imagen original
            return res.sendFile(imagePath);
        }
    } catch (err) {
        console.error('Error al acceder al archivo:', err);
        return res.status(404).json({ message: 'Imagen no encontrada' });
    }
/* res.sendFile(
        pathImg,(error)=>{
	if(error){
		console.log(error);
	}else{
		console.log('Enviado')
	}
	}
    );*/


}

const viewAttachmentOcp = async (req,res = response)=>{
    const tipo = req.query.path;
    const direct = tipo.split('.').slice(0, -1).join('.');
    //console.log(req)
   ///const file = req.params.file;
   console.log(tipo)
   //const pathImg = path.join('/mnt/volume_sfo2_01/oficialia/'+tipo);
   const pathImg = path.join('/users/ferson/documents/oficialia/'+tipo);
   res.sendFile(
       pathImg
   );
}

const saveFiles = async (filePath,fileDir,fileTemp) =>{
  
        if (fs2.existsSync(fileDir)) {
            fs2.copyFileSync
            fs2.rename(fileTemp,filePath,err=>{
            if (err){return console.error(err);}else{
                return true;
            }
                
            });
            }else{
    
            fs2.mkdirSync(fileDir, { recursive: true });
    
            fs2.rename(fileTemp,filePath,err=>{
                if (err) {return console.error(err);}else{
                    return true;
                }
    
                });
        }   
}

const saveFilesOcp = async (filePath,fileName,fileExt,fileTemp) =>{
    //let pathFiles = `/mnt/volume_sfo2_01/oficialia/`;
    let pathFiles = `/users/ferson/documents/oficialia/`;
    
    if (await fs.existsSync(`${pathFiles}${fileName}.${fileExt}`)){
        console.log('ENTRO 1')
        console.log(new Date());
        let counter = 1;
        let name;
        do {
            counter++;
            name = `${fileName}-${counter}.${fileExt}`;
            console.log('NAMESSSSSSSS',name)

        } while (await fs.existsSync(`${pathFiles}${name}`));

        //let pathFile = `/mnt/volume_sfo2_01/oficialia/${name}`;
        let pathFile = `/users/ferson/documents/oficilia/${name}`;
        await fs.renameSync(fileTemp,pathFile,err=>{
            if (err){return console.error(err);}else{
                return true;
            }
        });
        return {fileName:name}
        
    }else{
        console.log('ENTRO first');
        console.log(new Date());
        //let pathFile = `/mnt/volume_sfo2_01/oficialia/${fileName}.${fileExt}`;
        let pathFile = `/users/ferson/documents/oficialia/${fileName}.${fileExt}`;
        await fs.renameSync(fileTemp,pathFile,err=>{
            if (err){return console.error(err);}else{
                return true;
            }
        });

        return {fileName:`${fileName}.${fileExt}`};
        
    }
    
}

const saveAttachment = async(data,commentId)=>{
    try {
        for await (const f of data){
            const attach = await Attachments.create({
                fileName: f,
                url:f,
                idComment: commentId
            })
            attach.save();
        }
    } catch (error) {
        
    }
}

const setCommentAndAttachment = async (req, res = response) =>{
    let rawdata = fs.readFileSync(__dirname+'/test.json');
    let data = JSON.parse(rawdata);
    
    try {
        for(let i of data){
       
            let comment = await Comments.create({
                IdAuthor : 59,
                body : '',
                createdAt:new Date(),
                updatedAt:new Date(),
                IdChannel: 7,
                IdTicket:i.IdTicket,
                authorType:'Team'
            })
            if(comment){
                let attach = await Attachments.create({
                    IdComment:comment.IdComment,
                    fileName: i.ocp+'.pdf',
                    url:process.env.URL_UPLOADSOCP+i.ocp+'.pdf'
                })
            }
        }

        res.status(200).json({
            status: true,
            data:'OK'
        }) 
        
    } catch (error) {
        console.log(error)
        res.status(200).json({
            status: false,
            data:error
        }) 
    }
}

module.exports = {getCommentsByTicket,uploadAttachment,viewAttachment,viewAttachmentOcp,setCommentAndAttachment}
