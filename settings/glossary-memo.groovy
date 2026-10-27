import org.osgi.framework.*
import org.jahia.services.content.*
import org.jahia.services.SpringContextSingleton
import org.jahia.api.templates.JahiaTemplateManagerService
import javax.jcr.observation.*

/** Module-owned, bounded guest LIVE metadata. Never retains sessions or JCR nodes. */
class GlossaryMemo implements java.util.function.Function<String,Object>, SynchronousBundleListener, AutoCloseable {
  final Bundle bundle
  final Map entries=new LinkedHashMap()
  final List listeners=[]
  final def epoch=new java.util.concurrent.atomic.AtomicLong()
  final def registry=SpringContextSingleton.instance.context.getBeansOfType(JahiaTemplateManagerService).values().first().templatePackageRegistry
  long characters=0
  static final long TTL=300000000000L
  volatile boolean closed=false
  def registration
  GlossaryMemo(Bundle owner){bundle=owner}
  static void install(Bundle bundle){
    synchronized(bundle){
      String filter='(&(jahiacom.glossary.memo=v1)(jahiacom.glossary.owner='+bundle.bundleId+'))'
      if(bundle.bundleContext.getServiceReferences('java.util.function.Function',filter)?.length)return
      def memo=new GlossaryMemo(bundle)
      try{
        bundle.bundleContext.addBundleListener(memo)
        ['live','default'].each { workspace ->
          def listener=new GlossaryMemoInvalidator(memo)
          listener.workspace=workspace;listener.availableDuringPublish=true
          memo.listeners.add(listener);memo.registry.handleJCREventListener(listener,true)
        }
        def properties=new Hashtable()
        properties.put('jahiacom.glossary.memo','v1')
        properties.put('jahiacom.glossary.owner',bundle.bundleId.toString())
        memo.registration=bundle.bundleContext.registerService('java.util.function.Function',memo,properties)
      }catch(Exception failure){memo.close();throw failure}
    }
  }
  Object apply(String key){key=='epoch'?epoch.get().toString():null}
  synchronized Object read(String key){
    if(closed)return null
    def entry=entries.get(key)
    if(entry==null)return null
    if(System.nanoTime()-entry.time>TTL){entries.remove(key);characters-=entry.size;return null}
    return entry.value
  }
  synchronized void write(String key,long generation,Object value,List paths=[]){
    if(closed||epoch.get()!=generation||entries.containsKey(key))return
    int size=key.length()+groovy.json.JsonOutput.toJson(value).length()
    if(entries.size()>=2048||characters+size>2000000)return
    entries.put(key,[value:value,paths:paths,size:size,time:System.nanoTime()]);characters+=size
  }
  final Map editorial=new LinkedHashMap()
  long editorialCharacters=0
  void editorialContext(String sitePath,String language,String path) {
    if(!sitePath.startsWith('/sites/')||!path.startsWith(sitePath+'/')||!language.matches('[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*'))throw new IllegalArgumentException('Unsupported context')
  }
  private Map editorialRecord(JCRSessionWrapper session,String sitePath,String language,String path,long generation) {
    String key=sitePath+'|'+language+'|'+path
    def cached
    synchronized(this){
      cached=closed?null:editorial.get(key)
      if(cached!=null&&System.nanoTime()-cached.time>TTL){editorial.remove(key);editorialCharacters-=cached.size;cached=null}
    }
    if(cached!=null&&cached.data.paths.every{ dependency ->
      try{
        def node=session.getNode(dependency)
        return node.hasPermission('jcr:read')&&(!node.hasProperty('j:invalidLanguages')||!node.getProperty('j:invalidLanguages').values.any{it.string==language})
      }catch(Exception ignored){return false}
    })return cached.data
    def parts=[],paths=[];int[] visited=[0]
    Closure visit
    visit={ node,int depth ->
      if(++visited[0]>160||!node.hasPermission('jcr:read'))return
      paths.add(node.path)
      if(node.hasI18N(Locale.forLanguageTag(language))){
        String translation='j:translation_'+language
        if(node.hasNode(translation)){
          def translated=node.getNode(translation);paths.add(translated.path)
          if(!translated.hasPermission('jcr:read'))return
        }
        if(node.hasProperty('j:invalidLanguages')&&node.getProperty('j:invalidLanguages').values.any{it.string==language})return
        // Ranking keeps text only. Read through the guest-visible property,
        // without resolving href/src references which are discarded afterward.
        ['jcr:title','text','body','subtitle','introduction','description'].each { property -> if(node.hasProperty(property))parts.add(node.getProperty(property).getRealProperty().string?:'') }
      }
      if(depth<6&&visited[0]<160){
        def iterator=node.nodes;int remaining=160-visited[0],taken=0;def children=[]
        while(iterator.hasNext()&&taken++<remaining)children.add(iterator.nextNode())
        children.each{child ->if(!child.name.startsWith('j:')&&!child.isNodeType('jnt:page'))visit(child,depth+1)}
      }
    }
    visit(session.getNode(path),0)
    def data=[parts:parts,paths:paths]
    int size=key.length()+groovy.json.JsonOutput.toJson(data).length()
    synchronized(this){
      if(!closed&&epoch.get()==generation&&!editorial.containsKey(key)&&editorial.size()<1000&&editorialCharacters+size<=12000000){
        editorial.put(key,[data:data,size:size,time:System.nanoTime()]);editorialCharacters+=size
      }
    }
    return data
  }
  String editorialParts(String sitePath,String language,String path) {
    editorialContext(sitePath,language,path)
    long generation=epoch.get()
    def data=JCRTemplate.instance.doExecute('guest',null,'live',Locale.forLanguageTag(language),{ JCRSessionWrapper session ->
      editorialRecord(session,sitePath,language,path,generation)
    } as JCRCallback)
    return groovy.json.JsonOutput.toJson(data)
  }
  /** One guest session per batch; raw fragments and prepared text share dependencies. */
  String prepareResourceTexts(String sitePath,String language,String serializedPaths) {
    def requested=new groovy.json.JsonSlurper().parseText(serializedPaths)
    if(!(requested instanceof List)||requested.size()>128)throw new IllegalArgumentException('Unsupported batch')
    requested.each{path->editorialContext(sitePath,language,path)}
    long generation=epoch.get()
    def records=JCRTemplate.instance.doExecute('guest',null,'live',Locale.forLanguageTag(language),{ JCRSessionWrapper session ->
      requested.collect{path->
        def data=editorialRecord(session,sitePath,language,path,generation)
        String key=sitePath+'|'+language+'|'+path
        def text=null,token=null
        synchronized(this){
          def entry=editorial.get(key)
          // A failed permission check may produce fresh uncached data. Never pair
          // that data with a prepared text belonging to the former cache record.
          if(entry!=null&&entry.data.is(data)&&epoch.get()==generation){text=entry.text;token=entry.time.toString()}
        }
        def row=[path:path,paths:data.paths,token:token]
        if(text!=null)row.text=text
        else row.parts=data.parts
        row
      }
    } as JCRCallback)
    return groovy.json.JsonOutput.toJson(records)
  }
  synchronized void cacheResourceTexts(String sitePath,String language,long generation,String serializedTexts) {
    if(closed||epoch.get()!=generation)return
    def values=new groovy.json.JsonSlurper().parseText(serializedTexts)
    if(!(values instanceof List)||values.size()>128)throw new IllegalArgumentException('Unsupported batch')
    values.each{value->
      editorialContext(sitePath,language,value.path)
      def entry=editorial.get(sitePath+'|'+language+'|'+value.path)
      if(entry!=null&&entry.time.toString()==value.token&&System.nanoTime()-entry.time<=TTL&&value.text instanceof String){
        int extra=value.text.length()-(entry.text?.length()?:0)
        if(editorialCharacters+extra<=12000000){entry.text=value.text;entry.size+=extra;editorialCharacters+=extra}
      }
    }
  }

  String profileMemo(String key,long generation,String value){
    if(closed||epoch.get()!=generation)return null
    if(value==null)return read('profile|'+key) as String
    def context=new groovy.json.JsonSlurper().parseText(key)
    write('profile|'+key,generation,value,[context[2]]);return null
  }
  String termCatalogMemo(String key,long generation,String value){
    if(closed||epoch.get()!=generation)return null
    def context=new groovy.json.JsonSlurper().parseText(key)
    String sitePath=context[0],language=context[1],folder=context[2]
    if(!sitePath.startsWith('/sites/')||!folder.startsWith(sitePath+'/')||!language.matches('[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*'))throw new IllegalArgumentException('Unsupported context')
    if(value!=null){write('terms|'+key,generation,value,[folder]);return null}
    def cached=read('terms|'+key)
    if(cached==null)return null
    def data=new groovy.json.JsonSlurper().parseText(cached)
    boolean readable=JCRTemplate.instance.doExecute('guest',null,'live',Locale.forLanguageTag(language),{ JCRSessionWrapper session ->
      data.paths.every{ path -> try{return session.getNode(path).hasPermission('jcr:read')}catch(Exception ignored){return false} }
    } as JCRCallback)
    return readable&&epoch.get()==generation?cached:null
  }
  String prepareResourceMetadata(String sitePath,String language,boolean taxonomy) {
    if(!sitePath.startsWith('/sites/') || !language.matches('[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*'))throw new IllegalArgumentException('Unsupported context')
    long metadataGeneration=epoch.get()
    def data=JCRTemplate.instance.doExecute('guest',null,'live',Locale.forLanguageTag(language),{ JCRSessionWrapper session ->
      def records=[],dependencies=[]
      def stringValue={ node,name -> try{return node.getPropertyAsString(name)}catch(Exception ignored){return null} }
      def identity={ node -> try{return node.identifier}catch(Exception ignored){return node.path} }
      def references={ node,name ->
        try{def p=node.getProperty(name);def values=p.multiple?p.values:[p.value];return values.collect{it.node}.findAll{it!=null&&it.hasPermission('jcr:read')}}
        catch(Exception ignored){return []}
      }
      def lineage={ category ->
        def ids=[],node=category
        for(int depth=0;node!=null&&depth<12;depth++){
          try{if(!node.isNodeType('jnt:category'))break;ids.add(identity(node));node=node.parent}catch(Exception ignored){break}
        }
        return ids
      }
      ['jahiacom:blogEntry','jnt:page'].each{ type ->
        def query="SELECT * FROM [${type}] AS item WHERE ISDESCENDANTNODE(item, '${sitePath.replace("'","''")}')"
        def nodes=session.workspace.queryManager.createQuery(query,'JCR-SQL2').execute().nodes
        while(nodes.hasNext()){
          def node=nodes.nextNode();boolean visible=false
          try{
            dependencies.add(node.path)
            if(node.hasPermission('jcr:read')&&node.hasI18N(Locale.forLanguageTag(language))){
              def translation='j:translation_'+language
              if(node.hasNode(translation)){ if(!node.getNode(translation).hasPermission('jcr:read'))continue; dependencies.add(node.getNode(translation).path) }
              visible=!node.hasProperty('j:invalidLanguages')||!node.getProperty('j:invalidLanguages').values.any{it.string==language}
            }
          }catch(Exception ignored){}
          if(!visible)continue
          boolean published=false
          try{published=node.hasProperty('j:published')&&node.getProperty('j:published').boolean}catch(Exception ignored){}
          if(!published)continue
          // Access and publication decisions above are always re-read. Only
          // immutable presentation metadata is shared within one JCR epoch.
          String metadataKey=sitePath+'|'+language+'|'+taxonomy+'|'+node.path
          def cachedMetadata=read(metadataKey)
          if(cachedMetadata!=null && !cachedMetadata.dependencies.every { path ->
            try { return session.getNode(path).hasPermission('jcr:read') } catch(Exception ignored) { return false }
          })cachedMetadata=null
          if(cachedMetadata!=null){dependencies.addAll(cachedMetadata.dependencies);records.add(cachedMetadata);continue}

          boolean blog=node.isNodeType('jahiacom:blogEntry')
          def strings=[:],dates=[:]
          ['jcr:title','summary','jcr:description','description','pageType'].each{ name->strings[name]=stringValue(node,name) }
          ['date','publicationDate','jcr:created','jcr:lastModified'].each{ name ->
            try{
              if(node.hasProperty(name)){
                def value=stringValue(node,name);strings[name]=value
                def timestamp=null
                try{timestamp=node.getProperty(name).value.date.timeInMillis}catch(Exception ignored){}
                dates[name]=[timestamp:timestamp]
              }
            }catch(Exception ignored){dates[name]=[timestamp:null];strings[name]=stringValue(node,name)}
          }
          def referencePaths=[]
          def categories=(taxonomy||!blog)?references(node,'j:defaultCategory').collect{category ->
            def ancestor=category
            for(int depth=0;ancestor!=null&&depth<12;depth++) {
              if(!ancestor.hasPermission('jcr:read')||!ancestor.isNodeType('jnt:category'))break
              referencePaths.add(ancestor.path)
              String translation='j:translation_'+language
              if(ancestor.hasNode(translation))referencePaths.add(ancestor.getNode(translation).path)
              if(!taxonomy)break
              ancestor=ancestor.parent
            }
            [name:category.name,label:category.displayableName,lineage:taxonomy?lineage(category):[]]
          }:[]
          def clusters=taxonomy?references(node,'blogType').collect{referencePaths.add(it.path);identity(it)}:[]
          def metadata=[id:identity(node),path:node.path,displayName:node.displayableName,blog:blog,strings:strings,dates:dates,categories:categories,clusters:clusters,dependencies:referencePaths]
          records.add(metadata)
          dependencies.addAll(referencePaths)
          write(metadataKey,metadataGeneration,metadata,[node.path]+referencePaths)
        }
      }
      return [records:records,dependencies:dependencies]
    } as JCRCallback)
    return groovy.json.JsonOutput.toJson(data)
  }

  synchronized void invalidate(){epoch.incrementAndGet();entries.clear();characters=0;editorial.clear();editorialCharacters=0}
  /** Keep unrelated cached records; cancel in-flight writes for every observed change. */
  synchronized void invalidatePaths(List changed){
    if(!changed)return
    // Identities, ACLs and unknown/global paths can affect access in every site.
    if(changed.any{ !it.startsWith('/sites/')||it==~ /.*\/(j:acl|j:ace[^\/]*|rep:policy)(\/.*)?/ }){invalidate();return}
    epoch.incrementAndGet()
    def affected={ dependencies -> dependencies.any{ dependency -> changed.any{ path ->
      path==dependency||path.startsWith(dependency+'/')||dependency.startsWith(path+'/')
    } } }
    def iterator=entries.entrySet().iterator()
    while(iterator.hasNext()){
      def entry=iterator.next().value
      if(affected(entry.paths)){characters-=entry.size;iterator.remove()}
    }
    iterator=editorial.entrySet().iterator()
    while(iterator.hasNext()){
      def entry=iterator.next().value
      if(affected(entry.data.paths)){editorialCharacters-=entry.size;iterator.remove()}
    }
  }
  void bundleChanged(BundleEvent event){
    if(event.bundle.bundleId==bundle.bundleId&&event.type in [BundleEvent.STOPPING,BundleEvent.UPDATED,BundleEvent.UNINSTALLED])close()
  }
  synchronized void close(){
    if(closed)return
    closed=true;invalidate()
    listeners.each{registry.handleJCREventListener(it,false)};listeners.clear()
    try{bundle.bundleContext?.removeBundleListener(this)}catch(Exception ignored){}
    try{registration?.unregister()}catch(Exception ignored){}
  }
}
class GlossaryMemoInvalidator extends DefaultEventListener {
  final GlossaryMemo owner
  GlossaryMemoInvalidator(GlossaryMemo memo){owner=memo}
  int getEventTypes(){Event.NODE_ADDED|Event.NODE_REMOVED|Event.NODE_MOVED|Event.PROPERTY_ADDED|Event.PROPERTY_CHANGED|Event.PROPERTY_REMOVED}
  String getPath(){null}
  boolean isDeep(){true}
  void onEvent(EventIterator events){
    def paths=[]
    try{
      while(events.hasNext()){
        def event=events.nextEvent();paths.add(event.path)
        if(event.type in [Event.PROPERTY_ADDED,Event.PROPERTY_CHANGED,Event.PROPERTY_REMOVED])
          paths.add(event.path.substring(0,event.path.lastIndexOf('/')))
        // A move also invalidates values depending on the former location.
        if(event.type==Event.NODE_MOVED){
          def source=event.info?.get('srcAbsPath')
          paths.add(source?:'/')
        }
      }
    }catch(Exception ignored){owner.invalidate();return}
    owner.invalidatePaths(paths)
  }
}
