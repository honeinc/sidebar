default:
	lessc style.less > style.css
	component build

example:
	cd examples && rm -r components && component install
	ln -s ${PWD} ${PWD}/examples/components/honeinc-sidebar 
	cd examples && component build 
	@echo example built @ file://${PWD}/examples/index.html