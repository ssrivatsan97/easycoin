A simple blockchain node in Typescript developed for teaching

1. Install dependencies using `npm install pkg.json`
1. Compile using `tsc`
1. Run using `node index.js` to connect with full network on port 18018. Run using `bootstrap.js` if you want to run on server-only mode on port 18020

If you ever want to clear all objects and blocks stored in the database, run `node clear_databases.js`.

Check the file constants.ts for different protocol parameters, including which miner to use (Typescript/C++)

To mine using the C++ miner (which is much faster), do the following:
1. Clone the repository and the init the submodules:  
`git clone --recurse-submodules https://github.com/ssrivatsan97/easycoin`  

1. Install cmake to build, you will need a C++ compiler like gcc clang:  
`brew install cmake`  

1. Create a build directory and run cmake to compile the C++ miner code:  
`mkdir marabu_miner/build`  
`cd marabu_miner/build`  
`cmake ..`  
`make`  

1. After compiling, change `minerType` in constants.ts to `"cpp"`. Then compile using `tsc` and run `index.js` as usual.

Many thanks to (marabu-miner-test)[https://github.com/loukoum/marabu-miner-test] for the C++ implementation!