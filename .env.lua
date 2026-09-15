-- robolibs' directory environment. Loaded when you `cd` here, unloaded when you leave.

oslo.env.set("TOP_HEAD", oslo.sys.pwd())

-- A token in the environment is a token in every child process, and nothing in here needs it.
oslo.env.unset("GITHUB_TOKEN")

-- The commands this repository is driven by. All unload with the directory, so they cannot fire
-- the wrong project's build.
oslo.env.set_alias("_b", "make build")
oslo.env.set_alias("_t", "make test")
oslo.env.set_alias("_s", "make status")

oslo.source("/home/bresilla/.external")
