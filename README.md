A simple blockchain node in Typescript developed for teaching

1. Install dependencies using `npm install pkg.json`
1. Compile using `tsc`
1. Run using `node index.js` to connect with full network on port 18018. Run using `bootstrap.js` if you want to run on server-only mode on port 18020

If you ever want to clear all objects and blocks stored in the database, run `node clear_databases.js`.

Check the file constants.ts for different protocol parameters, including which miner to use (Typescript/C++), number of threads, name of the node, etc. Please change `myName` and `minerName` so that different nodes using this implementation can be distinguished.

To mine using the C++ miner (which is much faster), do the following:
1. Clone the repository and init the submodules:  
`git clone --recurse-submodules https://github.com/ssrivatsan97/easycoin`  

1. Install cmake to build, you will need a C++ compiler like gcc clang:  
`brew install cmake`  

1. Create a build directory and run cmake to compile the C++ miner code:  
`mkdir marabu_miner/build`  
`cd marabu_miner/build`  
`cmake ..`  
`make`
(If the above doesn't work on Ubuntu, try running `make` from the `marabu_miner` directory instead of from `marabu_miner/build` and then move the executables `HashRateThread` and `MinerStandalone` into `marabu_miner/build`.)

1. After compiling the C++ miner, change `minerType` in constants.ts to `"cpp"`. Check that `cppMinerPath` points to the correct path for `MinerStandalone`. Then compile using `tsc` and run `index.js` as usual.

1. You can also check the hash rate of the C++ miner by running `./HashRateThread` from within the directory `marabu_miner/build`.

Many thanks to [marabu-miner-test](https://github.com/loukoum/marabu-miner-test) for the C++ implementation!