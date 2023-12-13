const express= require('express')
const cors= require('cors')
const jwt= require('jsonwebtoken')
require('dotenv').config()
var cookieParser = require('cookie-parser')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const secret= 'iloveyou'
const port= process.env.PORT || 5000;
app.use(cors({
    // origin: ['https://book-library2.firebaseapp.com'],
    origin: ['http://localhost:5173'],
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())

//  mongodb connecetion



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.wjj4omp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const database= client.db('book-library').collection('bookcategory');
    const booksDb=client.db('book-library').collection('books');
    const borrowedBooks= client.db('book-library').collection('borrowed-books')
    const authors= client.db('book-library').collection('author')
    

//  verify token

const verifyToken=async(req,res,next)=>{
    const {token}= req.cookies;
    console.log('usertoken is ',token);


    if (!token) {
       return res.status(401).send({message:'unauthorized'})

     }

 jwt.verify(token,process.env.ACCESS_TOKEN,(error,decoded)=>{
     if (error) {
       return res.status(401).send({message:'error '})

     }
     console.log(decoded ,'decoded gmail');
     req.user=decoded
     
     next()

 })

}




    app.get('/book-category',async(req,res)=>{
         
        const result= await database.find().toArray();
        res.send(result)

    })
//    get all books from books collection
    app.get('/books',async(req,res)=>{
   
      const filter= req.query.search
      console.log(filter,'hi iam filter');
      const query= {
         bookName:{$regex:new RegExp(filter,'i')}
      }
         
        const result= await booksDb.find(query).toArray();
        res.send(result)

    })

    // get specific book from booksDb collection
   
    app.get('/findbooksbyid/:id',async(req,res)=>{
        try {
            const id= req.params.id;
            const filterId= {_id: new ObjectId(id)}
           const result= await booksDb.find(filterId).toArray()
           res.send(result)
        } catch (error) {
            return res.send({error:true , message:error.message})
        }

    })

    // find a single book and update its quantity

    app.put('/findbooksbyid/:id',verifyToken,async(req,res)=>{
       
        try {
            const id= req.params.id;
            const filterId= {_id: new ObjectId(id)}
            const updateQuantity= {
                $inc:{
         
                 quantity:1
                
    
                }
    
                
            }
            const result = await booksDb.updateOne(filterId,updateQuantity)
           
          
            res.send(result)
        } 
        catch (error) {
            return res.send({error:true , message:error.message})
        }
          

   })

     
    // find all books based on category 

    app.get('/books/:id',async(req,res)=>{
        try {
            const id= req.params.id;
            const result= await booksDb.find({category:id}).toArray()
            res.send(result)
        } catch (error) {
           return res.send({error:true , message:error.message})
        }
    })
    // signleBook load
    app.get('/single-book/:id',async(req,res)=>{
      try {
        const id= req.params.id;
        const filter= {_id: new ObjectId(id)}
       const result= await booksDb.findOne(filter)
       res.send(result)
      } catch (error) {
        return res.send({error:true , message:error.message})
      }
   })

    //  add book to database 

    app.post('/books',verifyToken,async(req,res)=>{
        const body= req.body;
        const result= await booksDb.insertOne(body)

   res.send(result)
      })


    
    //    post borrowed-books to borrowed-book collection
    
    
    app.post('/borrowed-books',verifyToken,async(req,res)=>{
         
        let body= req.body;
        body.borrowedDate= new Date()
   
      
        // find existing book
 

      const existBorrowedBook= await  borrowedBooks.findOne({
         uniqueId:body.uniqueId,
         email: body.email
         
       })



        if(existBorrowedBook) {
         return  res.status(403).send({erro:'you have already  added this book'})
          
        }
      else{

        const result= await borrowedBooks.insertOne(body)
  
        res.send(result)
      }
      })

         //    get borrowed-books from borrowed-book collection
      app.get('/borrowed-books',verifyToken,async(req,res)=>{
        // console.log(req.cookies,'cookies');
        const queryEmail= req?.query.email;
         let query= {}
         if (queryEmail) {
            query={email:req.query.email}
           
         }
         const result= await borrowedBooks.find(query).toArray()
      
         res.send(result)
     
      })


      //  delete a book fromm borrowed-book  collection
      app.delete('/borrowed-books/:id' , verifyToken,async(req,res)=>{
        
        try {
            const query= req.params.id;
            const id = {_id: new ObjectId(query)}
             const result= await borrowedBooks.deleteOne(id)
             res.send(result)
        } 
        catch (error) {
            return res.send({error:true , message:error.message})
        }
         
    
       }) 


    //update book quantity after borrowed
    
    app.put('/books/:id',verifyToken,async(req,res)=>{
     
      
     try {
        const user= req.body;

     
     const id= req.params.id
        
        const filter= {_id:new ObjectId(id)}
        const options = { upsert: true };

    
        const quantityToNumber= Number(user.quantity)
  
        const updateUser= {
            $set:{
     
            quantity: quantityToNumber-1,
            

            }
        }
        const result = await booksDb.updateOne(filter,updateUser)
        res.send(result)

     } 
     
     catch (error) {
        return res.send({error:true , message:error.message})
     }
       })


    //  update bookcard just
    app.put('/update/:id',verifyToken,async(req,res)=>{
        
        try {
            const id = req.params.id
            const filter= {_id: new ObjectId(id)}
            const user= req.body;
           
             
            const updateUser= {
                $set:{
                bookName: user.bookName,
                quantity: user.quantity,
                rating: user.rating,
                author: user.author,
                category: user.category,
                bookImg: user.bookImg

    
                }
                 
                
            }
            const result = await booksDb.updateOne(filter,updateUser)
    
            res.send(result)
        } 
        
        catch (error) {
            return res.send({error:true , message:error.message})
        }
          
       })

    //    cookie relate api

    app.post('/jwt',async(req,res)=>{
        const user= req.body;
        
     
     const token= jwt.sign(user,process.env.ACCESS_TOKEN, {expiresIn:'2h'}) ;

     
      res.cookie('token',token,{
        httpOnly:false,
        secure:true,
        sameSite:'none'
   
     
      }).send({success:true})

     })  


    //  jwt logout if cookie invaild

    app.post('/logout',(req,res)=>{
        res.clearCookie('token')
        res.status(404).send({message:"you are logged out"})
    })


    //  get author authors data

    app.get('/author',async(req,res)=>{
         
        const result= await authors.find().toArray();
        res.send(result)

    })


    


      





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('server is running shadin')
})


app.listen(port, ()=>{
    console.log('book server is running');
})