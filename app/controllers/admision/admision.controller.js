var express = require('express');
var router = express.Router();
const sql = require('mssql');
const jwt = require('./jwt');

const createConnection = (config) => new sql.ConnectionPool(config).connect();

async function getQuery (req, res, config, query) {

    let responseToken = jwt.validateJWTToken(req);
    if(responseToken.status != 0){
        return res.status(responseToken.status).send({status:0, message:  responseToken.message});
    }

    let pool;

    try {
        pool = await createConnection(req.app.get(config));
        const result = await pool.request().query(query);
        res.json({status:1, result:  result.recordset});
    } catch (error) {
        res.json({status:0, message:  'Ocurrio un error' + error});
    } finally {
        if (pool) await pool.close();
    }
    
};

router.get('/token', function(req, res, next) {
    
    jwt.getToken(req,res,next);
 
});


router.get('/sedes', async (req, res) => {

    getQuery(
        req, res,
        'dbConfig',
        `SELECT 
            IDSede,NombreSede,LetraSeccion,CodigoDAX,Sistema,CodigoNum 
        FROM dbo.tblSede where Sistema = 'APEC'`);
});

router.get('/colegios/:departamento', async (req, res) => {

    const { departamento } = req.params;

    getQuery(
        req, res,
        'dbConfig',
        `SELECT 
            CO.IDColegio,CO.NomColegio,CO.Telefono,CO.Email,CO.Direccion,CO.Ciudad,CO.IDDistrito,
            CO.IDProvincia,CO.IDDepartamento,CO.TipoColegio,CO.CodigoModular,
			C.COD_BANNER, C.CEN_EDU, C.Alias,
			C.CODGEO, C.D_DPTO, C.D_PROV, C.D_DIST
        FROM dbo.tblColegio CO
		INNER JOIN [dbo].[tblColegio2016] C ON
		C.COD_MOD=CO.CodigoModular
		WHERE SUBSTRING(ISNULL(C.CODGEO,CO.IDDistrito),1,2)  = '${departamento}'`);
});

router.get('/periodos', async (req, res) => {

    getQuery(
        req, res,
        'dbConfig',
        `SELECT DISTINCT IDPerAcad
        FROM tblEquivalenciaSeccion  
        WHERE CONVERT(DATE, GETDATE()) < CONVERT(DATE, fechainicio)  
        ORDER BY IDPerAcad`);
});

router.get('/escuelas', async (req, res) => {

    getQuery(
        req, res,
        'dbConfig',
        `SELECT 
        IDDependencia,
        IDEscuela,
        IDFacultad,
        IDTipoEsc,
        Nombre,
        NomEscuela,
        NomEsc,
        Facultad,
        IngresoDirecto,
        Activo,
        IDCuentaIns,
        IDCuentaCar,
        Color,
        CredObligAprob,
        CredElectAprob,
        NombreSemestre,
        Programa,
        MailResponsable,
        RutaActa,
        DepAcademico,
        AdmWebDisponible,
        IDTituloCEP,
        NombreSemestreTipo,
        Ver,
        IDUnidadNegocio,
        IDCentroCostoTemp,
        NumCiclos,
        Familia,
        IDCategoriaPens,
        VerWeb,
        NombreBI
        FROM dbo.tblEscuela 
        where IDTipoEsc = 'CAR' and IDDependencia = 'UCCI'`);
});

router.get('/escuelaadmision/:department/:sede', async (req, res) => {

    const department = req.params.department;
    const sede = req.params.sede;

    getQuery(
        req, res,
        'dbConfig',
        `select department, campusCode, programId, programName, status
        from dbo.tblEscuelaAdmision
        where department = '${department}' and campusCode = '${sede}'`);
});

router.get('/modalidadadmision/:periodo/:escuela', async (req, res) => {

    const escuela = req.params.escuela;
    const periodo = req.params.periodo;

    getQuery(
        req, res,
        'dbConfig',
        `
      SELECT TOP (100) PERCENT dbo.tblModalidadPostu.IDEscuelaADM,
                              dbo.tblModalidadPostu.IDModalidadPostu,
                              dbo.tblModalidadPostu.Descripcion
      FROM   dbo.tblModalidadPostuRecruiter
      INNER JOIN  dbo.tblModalidadPostu
          ON  dbo.tblModalidadPostuRecruiter.IDModalidadPostu = dbo.tblModalidadPostu.IDModalidadPostu
          AND dbo.tblModalidadPostuRecruiter.departament = dbo.tblModalidadPostu.IDEscuelaADM
      WHERE   (dbo.tblModalidadPostu.IDPerAcad = '${periodo}')
          AND (dbo.tblModalidadPostu.IDDependencia = 'UCCI')
          AND (dbo.tblModalidadPostu.IDEscuelaADM = '${escuela}')
          AND (NOT (dbo.tblModalidadPostu.IDModalidadPostu IN ('56', '111','36','38','39','41','42','47','61','93'
      ,'94','95','120', '121', '122', '123', '124', '125', '13', '34', '40', '108', '110', '107', '112', '126', '127', '128',
      '97','98','99','129','101','102','103','130')))
      ORDER BY dbo.tblModalidadPostu.IDEscuelaADM, dbo.tblModalidadPostu.IDModalidadPostu
      `);
});

router.get('/modalidadestudio', async (req, res) => {

    getQuery(
        req, res,
        'BDINTBANNERConfig',
        `SELECT 
            departament,departamentDescription,
            CASE 
            WHEN departament = 'UPGT' THEN 'ADG' 
            WHEN departament = 'UREG' THEN 'ADM'
            WHEN departament = 'UVIR' THEN 'ADV'
            ELSE '' END as codigoApec
        FROM DIM.tblDepartament where campana = 1`);
});


router.post('/', async (req, res) => {

    let responseToken = jwt.validateJWTToken(req);
    if(responseToken.status != 0){
        return res.status(responseToken.status).send({status:0, message:  responseToken.message});
    }

    const form = req.body;
    const responseHTTP = {
      status: false,
      errorMessage: null,
      idPayment: null,
      urlPayment: null
    }
    let pool;
  
    console.log(form);
  
    try {
      pool = await createConnection(req.app.get('dbConfig'));
      const requestDB = pool.request();
      
      requestDB.input('c_Nombres', sql.VarChar(100), form.firstName);
      requestDB.input('c_Apellido_Paterno', sql.VarChar(100), form.lastName);
      requestDB.input('c_Apellido_Materno', sql.VarChar(100), form.motherLastName);
      requestDB.input('c_Celular', sql.VarChar(20), form.cellphone);
      requestDB.input('c_Telefono', sql.VarChar(20), form.phone);
      requestDB.input('c_Correo_Electronico', sql.VarChar(100), form.email);
      requestDB.input('c_Tipo_Documento', sql.VarChar(20), form.docType);
      requestDB.input('c_Numero_Documento', sql.VarChar(15), form.docNumber);
      requestDB.input('c_DNI_Validacion', sql.Char(1), form.dniValidation);
      requestDB.input('c_Genero', sql.Char(1), form.genre);
      requestDB.input('c_Direccion', sql.VarChar(200), form.address);
      requestDB.input('c_Pais', sql.VarChar(10), form.country);
      requestDB.input('c_Distrito', sql.VarChar(10), form.liveDistrict);
      requestDB.input('c_Colegio_Id', sql.VarChar(10), form.college);
      requestDB.input('c_FechaNacimiento', sql.VarChar(10), form.birthdate);
      requestDB.input('c_Estado_Civil', sql.Char(1), form.civilStatus);
      requestDB.input('c_Ubigeo', sql.VarChar(10), form.ubigeeOfBirth);
      requestDB.input('c_IDLugarTrabajo', sql.VarChar(5), '');
      const responseDB = await requestDB.execute('[dbo].[sp_CrearActualizarPersonaFrm]');
      const personParams = responseDB.recordset[0];
  
      console.log(personParams);
  
      if (!personParams.Result) {
        throw 'No se completó la operación porque el procedimiento para crear o actualizar la persona devolvió: ' + personParams.strResult;
      }
  
      const requestDB_2 = pool.request();
      
      requestDB_2.input('c_ID', sql.VarChar(15), personParams.NumDocumento);
      requestDB_2.input('c_idpersona', sql.VarChar(20), personParams.IDPersona);
      requestDB_2.input('IDRegistroFormulario', sql.UniqueIdentifier, personParams.IDRegistroFormulario);
      requestDB_2.input('c_IDDependencia', sql.VarChar(6), 'UCCI');
      requestDB_2.input('c_IDSede', sql.VarChar(6), form.campus);
      requestDB_2.input('c_IDPerAcad', sql.VarChar(6), form.periodPostulation);
      requestDB_2.input('c_IDEscuelaADM', sql.VarChar(5), form.department);
      requestDB_2.input('c_IDModalidadAdmision', sql.VarChar(8), form.modality);
      requestDB_2.input('c_CodigoFecha', sql.VarChar(10), form.examDate);
      requestDB_2.input('c_carrera', sql.VarChar(6), form.program);
      requestDB_2.input('c_carrera2', sql.VarChar(6), form.secondProgram);
      requestDB_2.input('c_IDInstitucionProcedencia', sql.VarChar(11), form.institutionOfOrigin);
      requestDB_2.input('c_tipo_evaluacion', sql.VarChar(10), form.examType);
      requestDB_2.input('c_IDLugarTrabajo', sql.VarChar(5), '');
      const responseDB_2 = await requestDB_2.execute('[dbo].[sp_RegistrarPostulacionFrm]')
      const formRegistered = responseDB_2.recordset[0];
  
      console.log(formRegistered);

      if (!formRegistered.status) {
        throw 'No se completó la operación porque el procedimiento para registrar la postulación devolvió: ' + formRegistered.message;
      }
  
      responseHTTP.status = true;
      responseHTTP.idPayment = formRegistered.idPagoOnline;
      responseHTTP.urlPayment = `${req.app.get('config').urlcontipay}${responseHTTP.idPayment}`;
    } catch (error) {
      responseHTTP.status = false;
      responseHTTP.errorMessage = '' + error;
    } finally {
      if (pool) await pool.close();
    }
  
    res.send(responseHTTP);
  });

  router.post('/pagoonline', async (req, res) => {
    console.log("1");
    let responseToken = jwt.validateJWTToken(req);
    if(responseToken.status != 0){
        return res.status(responseToken.status).send({status:0, message:  responseToken.message});
    }
    
    const  form  = req.body
    let pool = null;
    console.log("2");
    try {
        
        const pool = await createConnection(req.app.get('dbConfig'));

        const requestDB = pool.request();
        requestDB.input('c_IDPago', sql.Char(9), form.idpago);
        requestDB.input('c_formapago', sql.CHAR(1), form.formapago);
        requestDB.input('c_tipocomprobante', sql.CHAR(1), form.tipoComprobante);
        requestDB.input('c_estado', sql.CHAR(1), form.estado);
        requestDB.input('c_idbanco', sql.VarChar(8), form.idbanco);
        requestDB.input('c_tipotarjeta', sql.VarChar(1), form.tipotarjeta);
        requestDB.input('c_eticket', sql.VarChar(30), form.eticket);
        
        const result = await requestDB.execute('[dbo].[sp_updatepagoonline]');
        console.log("3");
        console.log(result);

        if (!result) 
            throw 'No se ha logrado realizar la operación de update pago online';
        
        console.log("4");

        if (form.eticket) {
            const requestDB_2 = pool.request();
            requestDB_2.input('c_eTicket', sql.VarChar(30), form.eticket);
            requestDB_2.input('c_respuesta', sql.VarChar(30), form.respuesta);
            requestDB_2.input('c_estado', sql.VarChar(30), form.estadoticket);
            requestDB_2.input('c_cod_tienda', sql.VarChar(30), form.codtienda); 
            requestDB_2.input('c_nordent', sql.VarChar(9), form.nordent);  
            requestDB_2.input('c_cod_accion', sql.VarChar(10), form.codaccion); 
            requestDB_2.input('c_nro_tarj', sql.VarChar(30), form.nrotarj);  
            requestDB_2.input('c_nombre_th', sql.VarChar(50), form.nombreth); 
            requestDB_2.input('c_ori_tarjeta',sql.VarChar(10), form.oritarjeta);
            requestDB_2.input('c_nom_emisor',sql.VarChar(50), form.nomemisor);
            requestDB_2.input('c_eci_result',sql.VarChar(10), form.eciresult); 
            requestDB_2.input('c_dsc_eci',sql.VarChar(50), form.dsceci); 
            requestDB_2.input('c_cod_autoriza',sql.VarChar(10), form.codautoriza);
            requestDB_2.input('c_cod_rescvv2',sql.VarChar(10), form.codrescvv2);
            requestDB_2.input('n_imp_autorizado',sql.Float, form.impautorizado);
            requestDB_2.input('c_fecha_hora_tx',sql.VarChar(15), form.fechahoratx);
            requestDB_2.input('c_fechahora_deposito',sql.VarChar(15), form.fechahoradeposito);
            requestDB_2.input('c_fechahora_devolucion', sql.VarChar(15), form.fechahoradevolucion);
            requestDB_2.input('c_dato_comercio', sql.VarChar(50), form.datocomercio);
            const responseDB_2 = await requestDB_2.execute('[dbo].[sp_updateTicketResult]');
            console.log("5");
            console.log(responseDB_2);
        }
        
        /*if (responseDB_2.rowsAffected.length <= 0 || responseDB_2.rowsAffected[0] == 0) 
            throw 'No se ha logrado realizar la operación de update ticket result';*/
        
        res.send({inserted: true});
    } catch (error) {
        console.log("error: " + error);
        res.send({inserted: false,message: error});
    } finally {
        if (pool) await pool.close();
    }
    });

module.exports = router;